#!/bin/bash

# Script automatisé pour générer le keystore Android et préparer les secrets GitHub
# Usage: chmod +x generate-android-keystore.sh && ./generate-android-keystore.sh

echo "=========================================="
echo "Générateur de Keystore Android"
echo "=========================================="
echo ""

# Demander le mot de passe
read -sp "Entrez le mot de passe pour le keystore (gardez-le précieusement !): " PASSWORD
echo ""
read -sp "Confirmez le mot de passe: " PASSWORD_CONFIRM
echo ""

if [ "$PASSWORD" != "$PASSWORD_CONFIRM" ]; then
    echo "❌ Les mots de passe ne correspondent pas!"
    exit 1
fi

# Informations par défaut
KEY_ALIAS="upload"
KEYSTORE_FILE="upload-keystore.jks"

echo ""
echo "⏳ Génération du keystore..."
echo ""

# Générer le keystore
keytool -genkey -v \
    -keystore "$KEYSTORE_FILE" \
    -keyalg RSA \
    -keysize 2048 \
    -validity 10000 \
    -alias "$KEY_ALIAS" \
    -storepass "$PASSWORD" \
    -keypass "$PASSWORD" \
    -dname "CN=VTC Dispatch, OU=Mobile, O=VTC Dispatch, L=Paris, ST=IDF, C=FR"

if [ $? -ne 0 ]; then
    echo "❌ Erreur lors de la génération du keystore"
    exit 1
fi

echo ""
echo "✅ Keystore généré: $KEYSTORE_FILE"
echo ""
echo "⏳ Encodage en base64..."

# Encoder en base64
if command -v base64 &> /dev/null; then
    KEYSTORE_BASE64=$(base64 -i "$KEYSTORE_FILE")
elif command -v openssl &> /dev/null; then
    KEYSTORE_BASE64=$(openssl base64 -in "$KEYSTORE_FILE" | tr -d '\n')
else
    echo "❌ Ni base64 ni openssl n'est disponible"
    exit 1
fi

echo "✅ Encodage terminé"
echo ""
echo "=========================================="
echo "🔐 SECRETS GITHUB À CONFIGURER"
echo "=========================================="
echo ""
echo "Allez sur votre repo GitHub:"
echo "Settings → Secrets and variables → Actions → New repository secret"
echo ""
echo "Ajoutez ces 4 secrets:"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "1️⃣  Secret Name: KEYSTORE_BASE64"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$KEYSTORE_BASE64"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "2️⃣  Secret Name: KEYSTORE_PASSWORD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PASSWORD"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "3️⃣  Secret Name: KEY_ALIAS"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$KEY_ALIAS"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "4️⃣  Secret Name: KEY_PASSWORD"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "$PASSWORD"
echo ""
echo "=========================================="
echo "⚠️  IMPORTANT - SÉCURITÉ"
echo "=========================================="
echo ""
echo "✅ Sauvegardez le fichier $KEYSTORE_FILE dans un endroit sûr"
echo "✅ Sauvegardez le mot de passe dans un gestionnaire de mots de passe"
echo "❌ NE COMMITEZ JAMAIS le fichier $KEYSTORE_FILE dans Git"
echo "❌ NE PARTAGEZ JAMAIS ces secrets publiquement"
echo ""
echo "Le fichier $KEYSTORE_FILE est déjà dans .gitignore"
echo ""
echo "🚀 Une fois les secrets configurés, lancez le workflow:"
echo "   GitHub → Actions → Build Android APK → Run workflow"
echo ""
