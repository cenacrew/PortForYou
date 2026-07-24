#!/usr/bin/env bash
# Installation idempotente de l'infra Port'ForYou sur GCP.
# Prérequis : gcloud auth login + facturation activée sur le projet.
# Usage : ./setup-gcp.sh [PROJECT_ID]
set -euo pipefail

PROJECT="${1:-portforyou-vsp}"
REGION="europe-west1"
GITHUB_REPO="${GITHUB_REPO:-cenacrew/PortForYou}" # owner/repo pour la CI (WIF)
ALERT_EMAIL="${ALERT_EMAIL:-valetnina.sp@gmail.com}" # destinataire des alertes 5xx
MONTHLY_BUDGET_EUR="${MONTHLY_BUDGET_EUR:-20}" # montant mensuel du budget Cloud Billing (seuils 50/90/100 %)
AR_KEEP_VERSIONS="${AR_KEEP_VERSIONS:-10}" # nb de versions les plus récentes conservées par package Artifact Registry
AR_MAX_AGE_DAYS="${AR_MAX_AGE_DAYS:-90}" # purge des images taguées SHA plus vieilles que ça

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

echo "▶ Cleanup policy Artifact Registry (garde ${AR_KEEP_VERSIONS} versions, purge > ${AR_MAX_AGE_DAYS}j)…"
# Chaque déploiement pousse une image taguée par SHA sans jamais rien purger —
# cette policy évite l'accumulation de stockage payant. set-cleanup-policies
# remplace l'intégralité des policies du repo à chaque appel : idempotent par
# nature (même résultat à chaque exécution).
AR_CLEANUP_FILE=$(mktemp)
cat > "$AR_CLEANUP_FILE" <<EOF
[
  {
    "name": "keep-minimum-versions",
    "action": { "type": "Keep" },
    "mostRecentVersions": { "keepCount": ${AR_KEEP_VERSIONS} }
  },
  {
    "name": "delete-old-versions",
    "action": { "type": "Delete" },
    "condition": { "olderThan": "${AR_MAX_AGE_DAYS}d" }
  }
]
EOF
gcloud artifacts repositories set-cleanup-policies pfy --location="$REGION" \
  --policy="$AR_CLEANUP_FILE" --no-dry-run >/dev/null
rm -f "$AR_CLEANUP_FILE"

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
# pfy-tenant : SA d'exécution (moindre privilège) des services Cloud Run tenant.
for SA in pfy-api pfy-ci pfy-tenant; do
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
# Lecture des images templates : requis au preflight du déploiement Cloud Run
# (le contrôle d'accès à l'image porte sur l'identité qui déploie = pfy-api).
gcloud artifacts repositories add-iam-policy-binding pfy --location="$REGION" \
  --member="serviceAccount:$API_SA" --role="roles/artifactregistry.reader" >/dev/null

echo "▶ Rôles du SA d'exécution des tenants (moindre privilège)…"
TENANT_SA="pfy-tenant@$PROJECT.iam.gserviceaccount.com"
# Firestore (données du tenant) ; l'accès aux secrets tenant est accordé par
# le provisioner secret par secret. Le pull de l'image est fait par l'agent
# Cloud Run, pas par ce SA.
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:$TENANT_SA" --role="roles/datastore.user" --condition=None >/dev/null
gcloud storage buckets add-iam-policy-binding gs://portforyou-uploads \
  --member="serviceAccount:$TENANT_SA" --role="roles/storage.objectAdmin" >/dev/null

echo "▶ Rôles du SA de la CI (déploiement plateforme uniquement)…"
CI_SA="pfy-ci@$PROJECT.iam.gserviceaccount.com"
for ROLE in \
  roles/artifactregistry.writer \
  roles/run.developer \
  roles/storage.objectAdmin \
  roles/datastore.user \
  roles/firebasehosting.admin \
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

echo "▶ Firestore PITR (Point-in-Time Recovery, 7 jours)…"
PITR_STATE=$(gcloud firestore databases describe --database="(default)" \
  --format='value(pointInTimeRecoveryEnablement)' 2>/dev/null || echo "")
if [ "$PITR_STATE" != "POINT_IN_TIME_RECOVERY_ENABLED" ]; then
  gcloud firestore databases update --database="(default)" --enable-pitr >/dev/null
else
  echo "  déjà activé, rien à faire."
fi
# Exports GCS hebdomadaires (archive longue durée, complémentaire au PITR) :
# voir infra/scripts/setup-backups.sh, à lancer après ce script.

echo "▶ Politiques TTL Firestore (purge auto des jetons expirés)…"
# Chaque collection de jetons d'auth maison (apps/api/src/auth/service.ts) a un
# champ expiresAt (Timestamp) déjà écrit à la création du document — il suffit
# d'activer la policy TTL native dessus, aucune modification du code API.
for TTL_COLLECTION in sessions password_resets email_verifications; do
  TTL_STATE=$(gcloud firestore fields describe expiresAt \
    --collection-group="$TTL_COLLECTION" --database="(default)" \
    --format='value(ttlConfig.state)' 2>/dev/null || echo "")
  if [ "$TTL_STATE" != "ACTIVE" ]; then
    gcloud firestore fields ttls update expiresAt \
      --collection-group="$TTL_COLLECTION" --database="(default)" --enable-ttl >/dev/null
  else
    echo "  $TTL_COLLECTION.expiresAt déjà en TTL actif, rien à faire."
  fi
done

echo "▶ Secret JWT de la plateforme…"
gcloud secrets describe pfy-jwt-secret >/dev/null 2>&1 || {
  openssl rand -hex 32 | tr -d '
' | gcloud secrets create pfy-jwt-secret --data-file=-
}

echo "▶ Secret OAuth Google (placeholder — renseigner la vraie valeur ensuite)…"
# Le client OAuth Google se crée à la main dans la console (aucune API/CLI dispo).
# On crée le secret vide ; pousser la valeur après création du client :
#   printf '%s' 'GOCSPX-...' | gcloud secrets versions add pfy-google-oauth-secret --data-file=-
if ! gcloud secrets describe pfy-google-oauth-secret >/dev/null 2>&1; then
  printf '%s' 'PLACEHOLDER' | gcloud secrets create pfy-google-oauth-secret --data-file=-
fi
gcloud secrets add-iam-policy-binding pfy-google-oauth-secret \
  --member="serviceAccount:$API_SA" --role="roles/secretmanager.secretAccessor" >/dev/null 2>&1 || true

echo "▶ Secrets Stripe (placeholders — renseigner les vraies valeurs ensuite)…"
# La cle secrete (sk_test/sk_live) et le secret du webhook (whsec_...) se
# recuperent dans le dashboard Stripe. Pousser ensuite :
#   printf '%s' 'sk_test_...'  | gcloud secrets versions add pfy-stripe-secret  --data-file=-
#   printf '%s' 'whsec_...'    | gcloud secrets versions add pfy-stripe-webhook --data-file=-
for S in pfy-stripe-secret pfy-stripe-webhook; do
  gcloud secrets describe "$S" >/dev/null 2>&1 || printf '%s' 'PLACEHOLDER' | gcloud secrets create "$S" --data-file=-
  gcloud secrets add-iam-policy-binding "$S" \
    --member="serviceAccount:$API_SA" --role="roles/secretmanager.secretAccessor" >/dev/null 2>&1 || true
done

echo "▶ Secret Resend (envoi d'emails — placeholder)…"
# Cle API sur resend.com. Pousser ensuite :
#   printf '%s' 're_...' | gcloud secrets versions add pfy-resend-key --data-file=-
gcloud secrets describe pfy-resend-key >/dev/null 2>&1 || printf '%s' 'PLACEHOLDER' | gcloud secrets create pfy-resend-key --data-file=-
gcloud secrets add-iam-policy-binding pfy-resend-key \
  --member="serviceAccount:$API_SA" --role="roles/secretmanager.secretAccessor" >/dev/null 2>&1 || true

echo "▶ Cloud Scheduler (health checks + purge des slugs + cycle de facturation + rotation secrets)…"
API_URL=$(gcloud run services describe pfy-api --region "$REGION" --format='value(status.url)' 2>/dev/null || echo "")
if [ -n "$API_URL" ]; then
  gcloud scheduler jobs describe pfy-health-checks --location="$REGION" >/dev/null 2>&1 ||
    gcloud scheduler jobs create http pfy-health-checks --location="$REGION" \
      --schedule="*/30 * * * *" --uri="$API_URL/internal/health-checks" --http-method=POST \
      --oidc-service-account-email="$API_SA" --oidc-token-audience="$API_URL"
  gcloud scheduler jobs describe pfy-cleanup-slugs --location="$REGION" >/dev/null 2>&1 ||
    gcloud scheduler jobs create http pfy-cleanup-slugs --location="$REGION" \
      --schedule="0 * * * *" --uri="$API_URL/internal/cleanup-slugs" --http-method=POST \
      --oidc-service-account-email="$API_SA" --oidc-token-audience="$API_URL"
  # Facturation : le 1er de chaque mois à 03h00 (Europe/Paris), pousse l'usage infra sur Stripe.
  gcloud scheduler jobs describe pfy-billing-cycle --location="$REGION" >/dev/null 2>&1 ||
    gcloud scheduler jobs create http pfy-billing-cycle --location="$REGION" \
      --schedule="0 3 1 * *" --time-zone="Europe/Paris" \
      --uri="$API_URL/internal/billing-cycle" --http-method=POST \
      --oidc-service-account-email="$API_SA" --oidc-token-audience="$API_URL"
  # Rotation trimestrielle du JWT_SECRET des tenants (mot de passe admin non touché).
  gcloud scheduler jobs describe pfy-rotate-secrets --location="$REGION" >/dev/null 2>&1 ||
    gcloud scheduler jobs create http pfy-rotate-secrets --location="$REGION" \
      --schedule="0 4 1 */3 *" --time-zone="Europe/Paris" \
      --uri="$API_URL/internal/rotate-secrets" --http-method=POST \
      --oidc-service-account-email="$API_SA" --oidc-token-audience="$API_URL"
else
  echo "  ⚠️  pfy-api pas encore déployé — relancer ce script après le premier deploy pour créer les jobs Scheduler."
fi

echo "▶ Dashboard Cloud Monitoring…"
# Note : les noms contiennent une apostrophe ("Port'ForYou") — on passe par une
# variable + guillemets doubles dans --filter pour éviter tout souci
# d'échappement bash / grammaire de filtre gcloud (qui accepte aussi bien ' que ").
DASHBOARD_DISPLAY_NAME="Port'ForYou — Vue d'ensemble plateforme & tenants"
DASHBOARD_NAME=$(gcloud monitoring dashboards list \
  --filter="displayName=\"$DASHBOARD_DISPLAY_NAME\"" \
  --format='value(name)' 2>/dev/null | head -n1)
if [ -n "$DASHBOARD_NAME" ]; then
  gcloud monitoring dashboards update "$DASHBOARD_NAME" \
    --config-from-file="$(dirname "$0")/../monitoring/dashboard.json" >/dev/null
else
  gcloud monitoring dashboards create \
    --config-from-file="$(dirname "$0")/../monitoring/dashboard.json" >/dev/null
fi

echo "▶ Alertes 5xx Cloud Monitoring…"
CHANNEL_DISPLAY_NAME="Port'ForYou — alertes"
CHANNEL_NAME=$(gcloud alpha monitoring channels list \
  --filter="displayName=\"$CHANNEL_DISPLAY_NAME\"" --format='value(name)' 2>/dev/null | head -n1)
if [ -z "$CHANNEL_NAME" ]; then
  CHANNEL_NAME=$(gcloud alpha monitoring channels create \
    --display-name="$CHANNEL_DISPLAY_NAME" --type=email \
    --channel-labels="email_address=$ALERT_EMAIL" --format='value(name)')
fi
POLICY_NAME=$(gcloud alpha monitoring policies list \
  --filter='displayName="Erreurs 5xx — plateforme & tenants"' --format='value(name)' 2>/dev/null | head -n1)
POLICY_FILE=$(mktemp)
sed "s#__NOTIFICATION_CHANNEL__#$CHANNEL_NAME#" "$(dirname "$0")/../monitoring/alert-5xx.json" > "$POLICY_FILE"
if [ -n "$POLICY_NAME" ]; then
  gcloud alpha monitoring policies update "$POLICY_NAME" --policy-from-file="$POLICY_FILE" >/dev/null
else
  gcloud alpha monitoring policies create --policy-from-file="$POLICY_FILE" >/dev/null
fi
rm -f "$POLICY_FILE"

echo "▶ Budget avec alertes (${MONTHLY_BUDGET_EUR} €, seuils 50/90/100 %)…"
# Nécessite le BILLING_ACCOUNT_ID du compte de facturation lié au projet — action
# manuelle (non scriptable) : console.cloud.google.com/billing → repérer l'ID au
# format XXXXXX-XXXXXX-XXXXXX, ou `gcloud billing accounts list`.
if [ -n "${BILLING_ACCOUNT_ID:-}" ]; then
  EXISTING_BUDGET=$(gcloud billing budgets list --billing-account="$BILLING_ACCOUNT_ID" \
    --filter="displayName:portforyou-budget" --format='value(name)' 2>/dev/null | head -n1)
  if [ -n "$EXISTING_BUDGET" ]; then
    gcloud billing budgets update "$EXISTING_BUDGET" --billing-account="$BILLING_ACCOUNT_ID" \
      --budget-amount="${MONTHLY_BUDGET_EUR}EUR" \
      --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
      --filter-projects="projects/$PROJECT" >/dev/null
  else
    gcloud billing budgets create --billing-account="$BILLING_ACCOUNT_ID" \
      --display-name="portforyou-budget" \
      --budget-amount="${MONTHLY_BUDGET_EUR}EUR" \
      --threshold-rule=percent=0.5 --threshold-rule=percent=0.9 --threshold-rule=percent=1.0 \
      --filter-projects="projects/$PROJECT" >/dev/null
  fi
else
  echo "  ⚠️  BILLING_ACCOUNT_ID non défini — créer le budget manuellement ou relancer avec BILLING_ACCOUNT_ID=XXXXXX-XXXXXX-XXXXXX"
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
