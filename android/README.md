# Driver VTC Dispatch - Android Native Project

Ce répertoire contient le projet Android natif généré par Capacitor pour l'application Driver VTC Dispatch.

## 📁 Structure du Projet

```
android/
├── app/
│   ├── src/main/
│   │   ├── AndroidManifest.xml    # Configuration et permissions Android
│   │   ├── java/                   # Code Java natif
│   │   └── res/                    # Ressources (icônes, splash screen, etc.)
│   ├── build.gradle                # Configuration Gradle de l'app
│   ├── proguard-rules.pro          # Règles d'optimisation ProGuard
│   └── google-services.json        # Configuration Firebase (si présent)
├── build.gradle                    # Configuration Gradle racine
├── variables.gradle                # Variables de version SDK
├── key.properties.example          # Exemple de configuration keystore
└── README.md                       # Ce fichier
```

## 🔧 Configuration Requise

- **Android Studio** Arctic Fox ou plus récent
- **JDK 17** ou plus récent
- **Android SDK** API 35 (Android 14)
- **Minimum SDK** API 23 (Android 6.0)

## 🚀 Build Local

### Option 1 : Via le script (Recommandé)

```bash
# Depuis la racine du projet
./scripts/build-android.sh

# Ou spécifier le type de build
./scripts/build-android.sh debug    # Debug uniquement
./scripts/build-android.sh release  # Release uniquement
```

### Option 2 : Commandes manuelles

```bash
# Installer les dépendances et builder l'app web
npm install
npm run build

# Synchroniser avec Capacitor
npx cap sync android

# Builder le debug APK
cd android
./gradlew assembleDebug

# Builder le release APK (nécessite keystore)
./gradlew assembleRelease
```

### Option 3 : Via Android Studio

1. Ouvrez le dossier `android/` dans Android Studio
2. Attendez la synchronisation Gradle
3. Sélectionnez Build > Build Bundle(s) / APK(s) > Build APK(s)

## 🔐 Configuration du Keystore (pour Release)

1. Générer un keystore :
```bash
keytool -genkey -v -keystore upload-keystore.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias upload
```

2. Créer `android/key.properties` :
```properties
storePassword=VOTRE_MOT_DE_PASSE
keyPassword=VOTRE_MOT_DE_PASSE
keyAlias=upload
storeFile=upload-keystore.jks
```

3. Placer `upload-keystore.jks` dans `android/app/`

## 📱 Permissions Android

L'application utilise les permissions suivantes :

| Permission | Usage |
|------------|-------|
| `INTERNET` | Connexion au serveur Supabase |
| `ACCESS_FINE_LOCATION` | Géolocalisation précise |
| `ACCESS_BACKGROUND_LOCATION` | Suivi en arrière-plan |
| `FOREGROUND_SERVICE` | Service de géolocalisation |
| `POST_NOTIFICATIONS` | Notifications push |
| `CAMERA` | Scan de documents |

## 📦 Fichiers de Sortie

| Type | Emplacement |
|------|-------------|
| Debug APK | `app/build/outputs/apk/debug/app-debug.apk` |
| Release APK | `app/build/outputs/apk/release/app-release.apk` |
| Release AAB | `app/build/outputs/bundle/release/app-release.aab` |

## 🔗 Documentation

- [Guide de Build Android Complet](../ANDROID_BUILD_GUIDE.md)
- [Documentation Capacitor Android](https://capacitorjs.com/docs/android)
- [Publication sur Google Play](https://developer.android.com/studio/publish)

## ⚠️ Notes Importantes

- **Ne commitez jamais** `key.properties` ou les fichiers `.jks`
- Les fichiers `google-services.json` contiennent des clés Firebase
- Testez toujours sur un appareil réel avant publication
