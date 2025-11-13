# Guide de Build Android - Driver VTC Dispatch

## 📦 Prérequis

- Node.js 18+ installé
- Android Studio installé
- JDK 17 installé
- Git installé

## 🚀 Build APK de Test (Debug)

### Option 1 : Via GitHub Actions (Automatique) ✅ RECOMMANDÉ

1. Pushez votre code sur GitHub
2. Allez dans l'onglet "Actions" de votre repo
3. Lancez le workflow "Build Android APK"
4. Téléchargez l'APK généré dans les artifacts

### Option 2 : Build Local

```bash
# 1. Cloner le projet depuis GitHub
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
cd VOTRE_REPO

# 2. Installer les dépendances
npm install --legacy-peer-deps

# 3. Build le projet web
npm run build

# 4. Synchroniser avec Capacitor
npx cap sync android

# 5. Builder l'APK de debug
cd android
./gradlew assembleDebug

# L'APK sera dans : android/app/build/outputs/apk/debug/app-debug.apk
```

## 📱 Installer l'APK sur votre téléphone

1. Copiez `app-debug.apk` sur votre téléphone
2. Activez "Sources inconnues" dans les paramètres Android
3. Ouvrez le fichier APK pour l'installer
4. Testez l'application !

## 🏪 Build pour Google Play Store (Release Signé)

### Étape 1 : Créer un Keystore

```bash
cd android/app

# Créer le keystore (faites-le UNE SEULE FOIS)
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 \
  -alias upload
```

**⚠️ IMPORTANT** : Notez bien :
- Le mot de passe du keystore
- Le mot de passe de la clé
- Conservez le fichier `upload-keystore.jks` en sécurité (BACKUP!)

### Étape 2 : Configurer la signature

Créez le fichier `android/key.properties` :

```properties
storePassword=VOTRE_MOT_DE_PASSE_KEYSTORE
keyPassword=VOTRE_MOT_DE_PASSE_CLE
keyAlias=upload
storeFile=upload-keystore.jks
```

### Étape 3 : Builder l'APK de Release

```bash
cd android
./gradlew assembleRelease

# L'APK signé sera dans :
# android/app/build/outputs/apk/release/app-release.apk
```

### Étape 4 : Builder un AAB pour Google Play

```bash
cd android
./gradlew bundleRelease

# Le fichier AAB sera dans :
# android/app/build/outputs/bundle/release/app-release.aab
```

**📤 Uploadez `app-release.aab` sur Google Play Console**

## 🔧 Configuration Importante

### Changer l'URL de Production

Dans `capacitor.config.ts`, commentez la configuration de développement :

```typescript
const config: CapacitorConfig = {
  appId: 'com.lovable.drivervtcdispatch',
  appName: 'Driver VTC Dispatch',
  webDir: 'dist',
  // ⚠️ COMMENTEZ ces lignes pour la production :
  // server: {
  //   url: 'https://4abdee7f-238d-436b-9d0d-34c8665e5ddf.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
  plugins: {
    SplashScreen: {
      launchShowDuration: 2000,
      backgroundColor: '#1a1f2e',
      showSpinner: false,
    },
  },
};
```

### Configurer Firebase (Notifications Push)

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Créez un projet ou sélectionnez-en un
3. Ajoutez une application Android
4. Package name : `com.lovable.drivervtcdispatch`
5. Téléchargez `google-services.json`
6. Placez-le dans `android/app/google-services.json`
7. Rebuild l'application

## 📝 Checklist avant Publication

- [ ] Version et versionCode incrémentés dans `android/app/build.gradle`
- [ ] URL de production configurée (pas de `server.url` en dev)
- [ ] `google-services.json` configuré
- [ ] Keystore créé et sauvegardé
- [ ] APK/AAB testé sur plusieurs appareils
- [ ] Permissions vérifiées dans `AndroidManifest.xml`
- [ ] Icônes et splash screen configurés
- [ ] Description et captures d'écran préparées pour Google Play

## 🎨 Personnalisation

### Changer le nom de l'app

`android/app/src/main/res/values/strings.xml` :
```xml
<string name="app_name">Driver VTC Dispatch</string>
```

### Changer l'icône

Remplacez les fichiers dans :
- `android/app/src/main/res/mipmap-hdpi/`
- `android/app/src/main/res/mipmap-mdpi/`
- `android/app/src/main/res/mipmap-xhdpi/`
- `android/app/src/main/res/mipmap-xxhdpi/`
- `android/app/src/main/res/mipmap-xxxhdpi/`

Utilisez un outil comme [Icon Kitchen](https://icon.kitchen/) pour générer toutes les tailles.

## 🐛 Dépannage

### Erreur "SDK location not found"
```bash
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

### Erreur de build Gradle
```bash
cd android
./gradlew clean
./gradlew assembleDebug --stacktrace
```

### APK trop lourd
Activez la minification dans `android/app/build.gradle` :
```gradle
buildTypes {
    release {
        minifyEnabled true
        shrinkResources true
    }
}
```
