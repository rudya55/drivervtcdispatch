# Guide de Build Android - Driver VTC Dispatch

## 📦 Prérequis

| Outil | Version Requise |
|-------|-----------------|
| Node.js | 18+ (recommandé: 20) |
| Java JDK | 17 |
| Android SDK | API 35 |
| Git | Dernière version |

## 🚀 Build via GitHub Actions (Recommandé)

Le moyen le plus simple et fiable de générer un APK est d'utiliser GitHub Actions.

### Lancer un Build

1. Allez sur votre repository GitHub
2. Cliquez sur l'onglet **Actions**
3. Sélectionnez **Build Android APK/AAB**
4. Cliquez sur **Run workflow**
5. Choisissez le type de build :
   - `debug` : APK de test (non signé)
   - `release` : APK de production (signé si keystore configuré)
   - `both` : Les deux types (par défaut)
6. Cliquez sur **Run workflow**
7. Une fois terminé, téléchargez les artifacts

### Artifacts Générés

| Artifact | Description |
|----------|-------------|
| `driver-vtc-dispatch-debug` | APK de debug pour tests |
| `driver-vtc-dispatch-release` | APK release signé |
| `driver-vtc-dispatch-bundle` | AAB pour Google Play Store |

## 🔧 Build Local

### Option 1 : Script Automatisé

```bash
# Rendre le script exécutable
chmod +x scripts/build-android.sh

# Builder debug et release
./scripts/build-android.sh

# Ou builder un type spécifique
./scripts/build-android.sh debug
./scripts/build-android.sh release
```

### Option 2 : Commandes Manuelles

```bash
# 1. Installer les dépendances
npm install --legacy-peer-deps

# 2. Build le projet web
npm run build

# 3. Synchroniser avec Capacitor
npx cap sync android

# 4. Configurer le SDK
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# 5. Builder l'APK de debug
cd android
./gradlew assembleDebug

# L'APK sera dans : android/app/build/outputs/apk/debug/app-debug.apk
```

## 📱 Installer l'APK sur votre téléphone

### Via ADB (Android Debug Bridge)

```bash
# Connectez votre téléphone en USB avec le débogage activé
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### Manuellement

1. Copiez l'APK sur votre téléphone
2. Activez **Sources inconnues** dans Paramètres > Sécurité
3. Ouvrez le fichier APK pour l'installer
4. Testez l'application !

## 🔐 Configuration du Keystore pour la Signature

### Étape 1 : Générer un Keystore

```bash
cd android/app

# Créer le keystore (faites-le UNE SEULE FOIS)
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

**⚠️ IMPORTANT** : Conservez précieusement :
- Le fichier `upload-keystore.jks`
- Le mot de passe du keystore
- Le mot de passe de la clé
- Faites une sauvegarde sécurisée !

### Étape 2 : Configuration Locale

Créez `android/key.properties` (ne sera pas commité) :

```properties
storePassword=VOTRE_MOT_DE_PASSE_KEYSTORE
keyPassword=VOTRE_MOT_DE_PASSE_CLE
keyAlias=upload
storeFile=upload-keystore.jks
```

### Étape 3 : Configuration GitHub Actions

Pour les builds automatiques, configurez les secrets GitHub :

#### Encoder le keystore en Base64

```bash
# Sur macOS/Linux
base64 -i android/app/upload-keystore.jks | tr -d '\n' > keystore_base64.txt

# Sur Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\app\upload-keystore.jks")) > keystore_base64.txt
```

#### Ajouter les Secrets GitHub

1. Allez dans votre repo GitHub
2. Settings > Secrets and variables > Actions
3. Cliquez **New repository secret** pour chaque secret :

| Secret | Valeur |
|--------|--------|
| `KEYSTORE_BASE64` | Contenu de keystore_base64.txt |
| `KEYSTORE_PASSWORD` | Mot de passe du keystore |
| `KEY_ALIAS` | `upload` (ou votre alias) |
| `KEY_PASSWORD` | Mot de passe de la clé |

## 🏪 Publication sur Google Play Store

### Étape 1 : Builder l'AAB

```bash
cd android
./gradlew bundleRelease

# Fichier AAB : android/app/build/outputs/bundle/release/app-release.aab
```

### Étape 2 : Créer un compte développeur

1. Allez sur [Google Play Console](https://play.google.com/console)
2. Payez les frais d'inscription (25$ une fois)
3. Complétez les informations du profil

### Étape 3 : Créer l'application

1. Cliquez "Créer une application"
2. Remplissez les informations requises
3. Uploadez l'AAB dans Production > Releases

### Checklist avant Publication

- [ ] Version et versionCode incrémentés
- [ ] `server.url` commenté dans `capacitor.config.ts`
- [ ] `google-services.json` configuré (pour notifications)
- [ ] Keystore créé et sauvegardé
- [ ] APK testé sur plusieurs appareils
- [ ] Permissions vérifiées dans AndroidManifest.xml
- [ ] Icônes haute résolution préparées
- [ ] Captures d'écran préparées (min 2)
- [ ] Description en français et anglais
- [ ] Politique de confidentialité publiée

## 🎨 Personnalisation

### Changer le nom de l'app

`android/app/src/main/res/values/strings.xml` :
```xml
<string name="app_name">Driver VTC Dispatch</string>
```

### Changer l'icône

Remplacez les fichiers dans les dossiers :
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`

Utilisez [Icon Kitchen](https://icon.kitchen/) pour générer toutes les tailles.

### Changer le splash screen

Modifiez les images dans :
- `android/app/src/main/res/drawable-*/`

## 🐛 Troubleshooting

### Erreur "SDK location not found"

```bash
# Linux/macOS
echo "sdk.dir=$ANDROID_HOME" > android/local.properties

# Windows
echo sdk.dir=C:\\Users\\USERNAME\\AppData\\Local\\Android\\Sdk > android\local.properties
```

### Erreur de build Gradle

```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace --info
```

### Erreur "JAVA_HOME not set"

```bash
# Vérifier la version Java
java --version

# Définir JAVA_HOME (Linux/macOS)
export JAVA_HOME=$(/usr/libexec/java_home -v 17)

# Windows
set JAVA_HOME=C:\Program Files\Java\jdk-17
```

### APK trop lourd

La minification est activée automatiquement pour les builds release :
- `minifyEnabled true` - Optimise le code
- `shrinkResources true` - Supprime les ressources inutilisées
- ABI splits - Génère des APKs par architecture

### Keystore invalide

```bash
# Vérifier le contenu du keystore
keytool -list -v -keystore android/app/upload-keystore.jks
```

### Permissions non demandées

Vérifiez que les permissions sont bien dans :
- `android/app/src/main/AndroidManifest.xml`
- Le code JavaScript utilise les bons plugins Capacitor

## 📊 Versions

| Composant | Version |
|-----------|---------|
| versionCode | 2 |
| versionName | 1.0.1 |
| minSdkVersion | 23 (Android 6.0) |
| targetSdkVersion | 35 (Android 14) |
| compileSdkVersion | 35 |

## 📚 Ressources

- [Documentation Capacitor Android](https://capacitorjs.com/docs/android)
- [Guide de signature Android](https://developer.android.com/studio/publish/app-signing)
- [Documentation GitHub Actions](https://docs.github.com/en/actions)
- [Google Play Console](https://play.google.com/console)
