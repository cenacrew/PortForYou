#!/usr/bin/env bash
# Uptime checks Cloud Monitoring (gratuits jusqu'à 100) sur le health de l'API
# plateforme et des 3 tenants de démo, + alerte sur échec réutilisant le canal
# de notification déjà créé par setup-gcp.sh ("Port'ForYou — alertes").
# Détecte les services down même sans trafic (ce que les alertes 5xx ne voient
# pas). Idempotent, à relancer sans risque.
# Prérequis : setup-gcp.sh déjà exécuté (canal de notification, pfy-api déployé).
# Nécessite le composant `gcloud alpha` (channels/policies) — `gcloud components install alpha`.
# Usage : ./setup-uptime-checks.sh [PROJECT_ID]
set -euo pipefail

PROJECT="${1:-portforyou-vsp}"
REGION="europe-west1"
CHANNEL_DISPLAY_NAME="Port'ForYou — alertes"

echo "▶ Projet: $PROJECT — Région: $REGION"
gcloud config set project "$PROJECT" >/dev/null

echo "▶ Hôte de pfy-api…"
API_URL=$(gcloud run services describe pfy-api --region "$REGION" --format='value(status.url)' 2>/dev/null || echo "")
if [ -z "$API_URL" ]; then
  echo "  ⚠️  pfy-api pas encore déployé — relancer ce script après le premier deploy."
  exit 0
fi
API_HOST="${API_URL#https://}"

# name=host:path — un check HTTPS par entrée, période 5 min (défaut).
# Les 3 tenants de démo sont déployés (seed-demos avec PROVISIONER_DRIVER=gcp).
CHECKS=(
  "pfy-api — health:$API_HOST:/api/v1/health"
  "pfy-demo-atelier — health:pfy-demo-atelier.web.app:/api/v1/health"
  "pfy-demo-monolith — health:pfy-demo-monolith.web.app:/api/v1/health"
  "pfy-demo-papier — health:pfy-demo-papier.web.app:/api/v1/health"
)

echo "▶ Uptime checks…"
for ENTRY in "${CHECKS[@]}"; do
  NAME="${ENTRY%%:*}"
  REST="${ENTRY#*:}"
  HOST="${REST%%:*}"
  PATHNAME="${REST#*:}"

  EXISTING=$(gcloud monitoring uptime list-configs \
    --filter="displayName=\"$NAME\"" --format='value(name)' 2>/dev/null | head -n1)
  if [ -n "$EXISTING" ]; then
    echo "  $NAME : déjà présent, rien à faire (modifier via la console pour changer la config)."
    continue
  fi
  gcloud monitoring uptime create "$NAME" \
    --resource-type=uptime-url \
    --resource-labels="host=$HOST,project_id=$PROJECT" \
    --protocol=https --port=443 --path="$PATHNAME" \
    --period=5 --timeout=10 >/dev/null
  echo "  $NAME créé ($HOST$PATHNAME)."
done

echo "▶ Alerte sur échec des uptime checks (canal réutilisé de setup-gcp.sh)…"
CHANNEL_NAME=$(gcloud alpha monitoring channels list \
  --filter="displayName=\"$CHANNEL_DISPLAY_NAME\"" --format='value(name)' 2>/dev/null | head -n1)
if [ -z "$CHANNEL_NAME" ]; then
  echo "  ⚠️  Canal '$CHANNEL_DISPLAY_NAME' introuvable — lancer setup-gcp.sh d'abord."
  exit 1
fi
POLICY_NAME=$(gcloud alpha monitoring policies list \
  --filter='displayName="Uptime check en échec — plateforme & tenants démo"' \
  --format='value(name)' 2>/dev/null | head -n1)
POLICY_FILE=$(mktemp)
sed "s#__NOTIFICATION_CHANNEL__#$CHANNEL_NAME#" "$(dirname "$0")/../monitoring/alert-uptime.json" > "$POLICY_FILE"
if [ -n "$POLICY_NAME" ]; then
  gcloud alpha monitoring policies update "$POLICY_NAME" --policy-from-file="$POLICY_FILE" >/dev/null
else
  gcloud alpha monitoring policies create --policy-from-file="$POLICY_FILE" >/dev/null
fi
rm -f "$POLICY_FILE"

echo ""
echo "✅ Terminé. 4 uptime checks (gratuits, limite 100) + 1 policy d'alerte partagée."
