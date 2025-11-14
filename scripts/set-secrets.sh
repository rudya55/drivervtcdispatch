#!/usr/bin/env bash
set -euo pipefail

# Script d'aide pour encoder et ajouter les secrets GitHub via la CLI `gh`.
# Utilisation :
# 1) placez-vous à la racine du repo cloné
# 2) assurez-vous que `gh` est installé et connecté (gh auth login)
# 3) exécutez : bash scripts/set-secrets.sh

REPO_ARG=""
if [ -n "${GITHUB_REPO:-}" ]; then
  REPO_ARG="--repo $GITHUB_REPO"
fi

command -v gh >/dev/null 2>&1 || { echo "Erreur: 'gh' n'est pas installé. Installez et authentifiez l'outil GitHub CLI." >&2; exit 1; }

echo "Script set-secrets.sh — va encoder et pousser certains secrets (si présents)."

base64_nlfree() {
  # cross-platform: base64 then remove newlines
  base64 "$1" | tr -d '\n'
}

set_secret() {
  local name="$1"
  local body="$2"
  if [ -z "$body" ]; then
    echo "[skip] $name (vide)"
    return
  fi
  echo "Setting secret $name"
  gh secret set "$name" $REPO_ARG --body "$body"
}

# 1) google-services.json
if [ -f android/app/google-services.json ]; then
  echo "Found android/app/google-services.json — encoding and pushing as GOOGLE_SERVICES_JSON"
  val=$(base64_nlfree android/app/google-services.json)
  set_secret GOOGLE_SERVICES_JSON "$val"
else
  echo "android/app/google-services.json not found — skipping GOOGLE_SERVICES_JSON"
fi

# 2) keystore
if [ -f android/app/upload-keystore.jks ]; then
  echo "Found android/app/upload-keystore.jks — encoding and pushing as KEYSTORE_BASE64"
  val=$(base64_nlfree android/app/upload-keystore.jks)
  set_secret KEYSTORE_BASE64 "$val"
else
  echo "android/app/upload-keystore.jks not found — skipping KEYSTORE_BASE64"
fi

echo "Now you can set the remaining textual secrets. The script will prompt for any you want to set (press Enter to skip)."

read -r -p "KEYSTORE_PASSWORD (leave empty to skip): " KEYSTORE_PASSWORD
read -r -p "KEY_ALIAS (leave empty to skip; default 'upload'): " KEY_ALIAS
read -r -p "KEY_PASSWORD (leave empty to skip): " KEY_PASSWORD
read -r -p "GOOGLE_MAPS_API_KEY (leave empty to skip): " GOOGLE_MAPS_API_KEY
read -r -p "FIREBASE_API_KEY (leave empty to skip): " FIREBASE_API_KEY
read -r -p "FIREBASE_AUTH_DOMAIN (leave empty to skip): " FIREBASE_AUTH_DOMAIN
read -r -p "FIREBASE_PROJECT_ID (leave empty to skip): " FIREBASE_PROJECT_ID
read -r -p "FIREBASE_STORAGE_BUCKET (leave empty to skip): " FIREBASE_STORAGE_BUCKET
read -r -p "FIREBASE_MESSAGING_SENDER_ID (leave empty to skip): " FIREBASE_MESSAGING_SENDER_ID
read -r -p "FIREBASE_APP_ID (leave empty to skip): " FIREBASE_APP_ID
read -r -p "FIREBASE_VAPID_KEY (leave empty to skip): " FIREBASE_VAPID_KEY

set_secret KEYSTORE_PASSWORD "$KEYSTORE_PASSWORD"
if [ -n "$KEY_ALIAS" ]; then
  set_secret KEY_ALIAS "$KEY_ALIAS"
fi
set_secret KEY_PASSWORD "$KEY_PASSWORD"
set_secret GOOGLE_MAPS_API_KEY "$GOOGLE_MAPS_API_KEY"
set_secret FIREBASE_API_KEY "$FIREBASE_API_KEY"
set_secret FIREBASE_AUTH_DOMAIN "$FIREBASE_AUTH_DOMAIN"
set_secret FIREBASE_PROJECT_ID "$FIREBASE_PROJECT_ID"
set_secret FIREBASE_STORAGE_BUCKET "$FIREBASE_STORAGE_BUCKET"
set_secret FIREBASE_MESSAGING_SENDER_ID "$FIREBASE_MESSAGING_SENDER_ID"
set_secret FIREBASE_APP_ID "$FIREBASE_APP_ID"
set_secret FIREBASE_VAPID_KEY "$FIREBASE_VAPID_KEY"

echo "Tous les secrets demandés ont été traités. Vérifiez dans GitHub -> Settings -> Secrets and variables -> Actions"
