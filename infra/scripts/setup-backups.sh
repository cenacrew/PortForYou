#!/usr/bin/env bash
# Exports Firestore hebdomadaires vers GCS (archive longue durée, complète le
# PITR 7 jours activé par setup-gcp.sh). Idempotent, à relancer sans risque.
# Prérequis : setup-gcp.sh déjà exécuté (SA pfy-api existant).
# Usage : ./setup-backups.sh [PROJECT_ID]
set -euo pipefail

PROJECT="${1:-portforyou-vsp}"
REGION="europe-west1"
BUCKET="portforyou-firestore-backups"
API_SA="pfy-api@$PROJECT.iam.gserviceaccount.com"
RETENTION_DAYS=180

echo "▶ Projet: $PROJECT — Région: $REGION"
gcloud config set project "$PROJECT" >/dev/null

echo "▶ Bucket GCS des exports Firestore…"
gcloud storage buckets describe "gs://$BUCKET" >/dev/null 2>&1 ||
  gcloud storage buckets create "gs://$BUCKET" --location="$REGION" --uniform-bucket-level-access

echo "▶ Règle de cycle de vie (purge > ${RETENTION_DAYS}j)…"
LIFECYCLE_FILE=$(mktemp)
cat > "$LIFECYCLE_FILE" <<EOF
{
  "rule": [
    {
      "action": { "type": "Delete" },
      "condition": { "age": $RETENTION_DAYS }
    }
  ]
}
EOF
gcloud storage buckets update "gs://$BUCKET" --lifecycle-file="$LIFECYCLE_FILE" >/dev/null
rm -f "$LIFECYCLE_FILE"

echo "▶ IAM — le SA de l'API doit pouvoir exporter Firestore et écrire dans le bucket…"
# roles/datastore.importExportAdmin : requis pour appeler :exportDocuments.
gcloud projects add-iam-policy-binding "$PROJECT" \
  --member="serviceAccount:$API_SA" --role="roles/datastore.importExportAdmin" --condition=None >/dev/null
gcloud storage buckets add-iam-policy-binding "gs://$BUCKET" \
  --member="serviceAccount:$API_SA" --role="roles/storage.objectAdmin" >/dev/null

echo "▶ Cloud Scheduler — export hebdomadaire (dimanche 03h00 Europe/Paris)…"
# La cible est directement l'API REST Firestore (pas de endpoint /internal/* à
# maintenir côté pfy-api) : jeton OAuth (pas OIDC) car il s'agit d'une API
# Google, pas d'un service Cloud Run.
gcloud scheduler jobs describe pfy-firestore-export --location="$REGION" >/dev/null 2>&1 ||
  gcloud scheduler jobs create http pfy-firestore-export --location="$REGION" \
    --schedule="0 3 * * 0" --time-zone="Europe/Paris" \
    --uri="https://firestore.googleapis.com/v1/projects/$PROJECT/databases/(default):exportDocuments" \
    --http-method=POST \
    --oauth-service-account-email="$API_SA" \
    --message-body="{\"outputUriPrefix\":\"gs://$BUCKET\"}"

echo ""
echo "✅ Terminé."
echo "Vérifier un export manuel avant la première échéance planifiée :"
echo "   gcloud scheduler jobs run pfy-firestore-export --location=$REGION"
echo "   gcloud storage ls gs://$BUCKET"
echo "Procédure de restauration (PITR et import d'export) : voir docs/RUNBOOK.md § Restauration Firestore."
