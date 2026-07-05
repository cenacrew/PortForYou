#!/usr/bin/env bash
# Installation idempotente de l'infra Port'ForYou sur GCP.
# Prérequis : gcloud auth login + facturation activée sur le projet.
# Usage : ./setup-gcp.sh [PROJECT_ID]
set -euo pipefail

PROJECT="${1:-portforyou-vsp}"
REGION="europe-west1"
GITHUB_REPO="${GITHUB_REPO:-cenacrew/PortForYou}" # owner/repo pour la CI (WIF)

echo "▶ Projet: $PROJECT — Région: $REGION"
gcloud config set project "$PROJECT" >/dev/null

echo "▶ Activation des APIs…"
gcloud services enable \
  run.googleapis.com \
  firestore.googleapis.com \
  firebasehosting.googleapis.com \
  firebase.googleapis.com \
  cloudtasks.googleapis.com \
  secretmanager.googleapis.com \
  cloudscheduler.googleapis.com \
  artifactregistry.googleapis.com \
  cloudbuild.googleapis.com \
  iamcredentials.googleapis.com

echo "▶ Artifact Registry…"
gcloud artifacts repositories describe pfy --location="$REGION" >/dev/null 2>&1 ||
  gcloud artifacts repositories create pfy \
    --repository-format=docker --location="$REGION" \
    --description="Images Port'ForYou"

echo "▶ Buckets GCS…"
for BUCKET in "portforyou-template-builds" "portforyou-uploads"; do
  gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 ||
    gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access
done
# Les uploads des tenants sont publics en lecture (images des portfolios).
gcloud storage buckets add-iam-policy-binding gs://portforyou-uploads \
  --member=allUsers --role=roles/storage.objectViewer >/dev/null

echo "▶ Queue Cloud Tasks…"
gcloud tasks queues describe provisioning --location="$REGION" >/dev/null 2>&1 ||
  gcloud tasks queues create provisioning --location="$REGION" \
    --max-attempts=5 --min-backoff=30s --max-backoff=300s

echo "▶ Service accounts…"
for SA in pfy-api pfy-ci; do
  gcloud iam service-accounts describe "$SA@$PROJECT.iam.gserviceaccount.com" >/dev/null 2>&1 ||
    gcloud iam service-accounts create "$SA" --display-name="Port'ForYou $SA"
done

echo "▶ Rôles du SA de l'API (provisioning des tenants)…"
API_SA="pfy-api@$PROJECT.iam.gserviceaccount.com"
for ROLE in \
  roles/datastore.user \
  roles/run.admin \
  roles/firebasehosting.admin \
  roles/secretmanager.admin \
  roles/cloudtasks.enqueuer \
  roles/storage.objectAdmin \
  roles/iam.serviceAccountUser \
  roles/iam.serviceAccountTokenCreator; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$API_SA" --role="$ROLE" --condition=None >/dev/null
done

echo "▶ Rôles du SA de la CI (déploiement plateforme uniquement)…"
CI_SA="pfy-ci@$PROJECT.iam.gserviceaccount.com"
for ROLE in \
  roles/artifactregistry.writer \
  roles/run.developer \
  roles/storage.objectAdmin \
  roles/datastore.user \
  roles/iam.serviceAccountUser; do
  gcloud projects add-iam-policy-binding "$PROJECT" \
    --member="serviceAccount:$CI_SA" --role="$ROLE" --condition=None >/dev/null
done

echo "▶ Workload Identity Federation pour GitHub Actions…"
POOL_ID="github-pool"
PROVIDER_ID="github-provider"
gcloud iam workload-identity-pools describe "$POOL_ID" --location=global >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools create "$POOL_ID" --location=global \
    --display-name="GitHub Actions"
gcloud iam workload-identity-pools providers describe "$PROVIDER_ID" \
  --location=global --workload-identity-pool="$POOL_ID" >/dev/null 2>&1 ||
  gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
    --location=global --workload-identity-pool="$POOL_ID" \
    --issuer-uri="https://token.actions.githubusercontent.com" \
    --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" \
    --attribute-condition="assertion.repository == '$GITHUB_REPO'"

PROJECT_NUMBER=$(gcloud projects describe "$PROJECT" --format='value(projectNumber)')
gcloud iam service-accounts add-iam-policy-binding "$CI_SA" \
  --role=roles/iam.workloadIdentityUser \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/attribute.repository/$GITHUB_REPO" >/dev/null

echo "▶ Firestore (base par défaut, $REGION)…"
gcloud firestore databases describe --database="(default)" >/dev/null 2>&1 ||
  gcloud firestore databases create --location="$REGION"

echo "▶ Secret JWT de la plateforme…"
gcloud secrets describe pfy-jwt-secret >/dev/null 2>&1 || {
  openssl rand -hex 32 | tr -d '
' | gcloud secrets create pfy-jwt-secret --data-file=-
}

echo "▶ Cloud Scheduler (health checks + purge des slugs)…"
API_URL=$(gcloud run services describe pfy-api --region "$REGION" --format='value(status.url)' 2>/dev/null || echo "")
if [ -n "$API_URL" ]; then
  gcloud scheduler jobs describe pfy-health-checks --location="$REGION" >/dev/null 2>&1 ||
    gcloud scheduler jobs create http pfy-health-checks --location="$REGION" \
      --schedule="*/10 * * * *" --uri="$API_URL/internal/health-checks" --http-method=POST \
      --oidc-service-account-email="$API_SA" --oidc-token-audience="$API_URL"
  gcloud scheduler jobs describe pfy-cleanup-slugs --location="$REGION" >/dev/null 2>&1 ||
    gcloud scheduler jobs create http pfy-cleanup-slugs --location="$REGION" \
      --schedule="0 * * * *" --uri="$API_URL/internal/cleanup-slugs" --http-method=POST \
      --oidc-service-account-email="$API_SA" --oidc-token-audience="$API_URL"
else
  echo "  ⚠️  pfy-api pas encore déployé — relancer ce script après le premier deploy pour créer les jobs Scheduler."
fi

echo "▶ Budget avec alertes (5/10/20 €)…"
if [ -n "${BILLING_ACCOUNT:-}" ]; then
  gcloud billing budgets list --billing-account="$BILLING_ACCOUNT"     --filter="displayName:portforyou-budget" --format='value(name)' | grep -q . ||
    gcloud billing budgets create --billing-account="$BILLING_ACCOUNT"       --display-name="portforyou-budget"       --budget-amount=20EUR       --threshold-rule=percent=0.25 --threshold-rule=percent=0.5 --threshold-rule=percent=1.0       --filter-projects="projects/$PROJECT"
else
  echo "  ⚠️  BILLING_ACCOUNT non défini — créer le budget manuellement ou relancer avec BILLING_ACCOUNT=XXXXXX-XXXXXX-XXXXXX"
fi

echo ""
echo "✅ Terminé. Récapitulatif pour la CI GitHub (secrets/vars du repo) :"
echo "   GCP_PROJECT_ID        = $PROJECT"
echo "   GCP_WIF_PROVIDER      = projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID"
echo "   GCP_CI_SERVICE_ACCOUNT= $CI_SA"
echo ""
echo "Étapes manuelles restantes :"
echo " 1. Déployer les index Firestore : firebase deploy --only firestore:indexes"
echo " 2. Premier release des templates : workflow release-templates (ou push sur templates/**)"
echo " 3. Déployer l'API et la vitrine : workflow deploy-platform (ou push sur main)"
