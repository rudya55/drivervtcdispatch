# Guide de signature Android pour le Play Store

## 📝 Étape 1 : Générer le keystore (une seule fois)

Sur votre machine locale, exécutez :

```bash
keytool -genkey -v -keystore upload-keystore.jks -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

**IMPORTANT** : 
- Conservez précieusement le mot de passe que vous entrez
- Ne perdez JAMAIS ce fichier (faites des sauvegardes)
- Si vous perdez le keystore, vous ne pourrez plus mettre à jour votre app sur le Play Store

## 🔐 Étape 2 : Encoder le keystore en base64

```bash
base64 -i upload-keystore.jks -o keystore.txt
# ou sur Windows avec PowerShell :
# [Convert]::ToBase64String([IO.File]::ReadAllBytes("upload-keystore.jks")) | Out-File keystore.txt
```

Copiez le contenu du fichier `keystore.txt` généré.

## ⚙️ Étape 3 : Configurer les secrets GitHub

1. Allez sur votre repository GitHub
2. Cliquez sur **Settings** → **Secrets and variables** → **Actions**
3. Cliquez sur **New repository secret** et ajoutez :

| Nom du secret | Valeur | Description |
|---------------|--------|-------------|
| `KEYSTORE_BASE64` | Contenu du fichier keystore.txt | Keystore encodé en base64 |
| `KEYSTORE_PASSWORD` | Votre mot de passe du keystore | Mot de passe que vous avez créé |
| `KEY_ALIAS` | `upload` | L'alias (par défaut : upload) |
| `KEY_PASSWORD` | Votre mot de passe de la clé | Généralement le même que KEYSTORE_PASSWORD |

## 🚀 Étape 4 : Lancer le build

1. Allez dans l'onglet **Actions** de votre repo GitHub
2. Sélectionnez le workflow **Build Android APK**
3. Cliquez sur **Run workflow**
4. Attendez que le build se termine (~5-10 minutes)
5. Téléchargez l'APK signé dans les **Artifacts**

## 📦 Fichiers générés

Le workflow génère deux types de builds :

- **Debug APK** : `app-debug.apk` (non signé, pour tests)
- **Release APK** : `app-release.apk` (signé avec votre keystore, prêt pour le Play Store)

## 🏪 Publication sur le Play Store

1. Connectez-vous à la [Google Play Console](https://play.google.com/console)
2. Créez une nouvelle application
3. Remplissez les informations requises (description, captures d'écran, etc.)
4. Dans **Production** → **Créer une version**, uploadez l'APK `app-release.apk`
5. Soumettez pour examen

## ⚠️ Sécurité

- **NE COMMITEZ JAMAIS** le fichier `upload-keystore.jks` dans votre repo
- Le fichier est déjà dans `.gitignore` : `android/app/upload-keystore.jks.gitignore`
- Gardez vos secrets GitHub privés
- Faites une sauvegarde sécurisée du keystore (coffre-fort de mots de passe, cloud chiffré)

## 🔧 Build local (optionnel)

Si vous voulez builder localement :

```bash
# Créer le fichier key.properties
cat > android/key.properties << EOF
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE
keyAlias=upload
storeFile=upload-keystore.jks
EOF

# Copier le keystore
cp upload-keystore.jks android/app/

# Builder l'APK
cd android
./gradlew assembleRelease
```

L'APK signé sera dans : `android/app/build/outputs/apk/release/app-release.apk`

## 📋 Checklist avant publication

- [ ] Keystore généré et sauvegardé en lieu sûr
- [ ] Secrets GitHub configurés (4 secrets)
- [ ] Build GitHub Actions réussi
- [ ] APK téléchargé et testé
- [ ] Captures d'écran et description préparées
- [ ] Compte Google Play Developer créé (25$ une fois)
- [ ] Politique de confidentialité rédigée (obligatoire)

## 🆘 Dépannage

**Build échoue avec "keystore not found"** :
- Vérifiez que le secret `KEYSTORE_BASE64` est bien configuré
- Vérifiez que le contenu est correct (copié entièrement)

**APK non signé** :
- Vérifiez que les 4 secrets sont configurés
- Regardez les logs du workflow pour voir les messages d'erreur

**"Wrong password"** :
- Vérifiez que `KEYSTORE_PASSWORD` et `KEY_PASSWORD` correspondent au mot de passe que vous avez entré lors de la génération du keystore

## 📚 Ressources

- [Documentation Google Play](https://developer.android.com/studio/publish)
- [Signing your app](https://developer.android.com/studio/publish/app-signing)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
