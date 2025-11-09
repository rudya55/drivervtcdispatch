# Guide de Build Mobile - Driver VTC Dispatch

Ce guide vous explique comment créer l'application mobile pour iOS et Android.

## Prérequis

### Pour Android (APK)
- [Android Studio](https://developer.android.com/studio) installé
- Java JDK 11 ou supérieur
- Android SDK avec API Level 24+

### Pour iOS (IPA)
- macOS avec [Xcode](https://developer.apple.com/xcode/) installé
- Compte Apple Developer (99$/an)
- CocoaPods installé (`sudo gem install cocoapods`)

## Étapes de Build

### 1. Transférer le projet sur GitHub

1. Dans Lovable, cliquez sur le bouton **GitHub** en haut à droite
2. Exportez le projet vers votre dépôt GitHub
3. Clonez le projet sur votre machine :

```bash
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
cd VOTRE_REPO
```

### 2. Installation des dépendances

```bash
npm install
```

### 3. Initialiser Capacitor

```bash
npx cap init
```

Utilisez les valeurs suivantes :
- **App ID**: `app.lovable.4abdee7f238d436b9d0d34c8665e5ddf`
- **App Name**: `drivervtcdispatch`

### 4. Build du projet web

```bash
npm run build
```

### 5. Ajouter les plateformes

#### Pour Android :
```bash
npx cap add android
npx cap update android
```

#### Pour iOS :
```bash
npx cap add ios
npx cap update ios
cd ios/App
pod install
cd ../..
```

### 6. Synchroniser les assets

```bash
npx cap sync
```

## Build Android (APK/AAB)

### Option 1 : Via Android Studio (Recommandé)

1. Ouvrez Android Studio
2. Ouvrez le projet : `File > Open` → Sélectionnez le dossier `android/`
3. Attendez que Gradle sync se termine
4. Pour un APK de debug :
   - `Build > Build Bundle(s) / APK(s) > Build APK(s)`
   - L'APK sera dans `android/app/build/outputs/apk/debug/`

5. Pour un APK de release signé :
   - Créez un keystore si nécessaire :
     ```bash
     keytool -genkey -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
     ```
   - Ajoutez dans `android/gradle.properties` :
     ```
     MYAPP_RELEASE_STORE_FILE=my-release-key.keystore
     MYAPP_RELEASE_KEY_ALIAS=my-key-alias
     MYAPP_RELEASE_STORE_PASSWORD=****
     MYAPP_RELEASE_KEY_PASSWORD=****
     ```
   - `Build > Generate Signed Bundle / APK`

### Option 2 : En ligne de commande

```bash
cd android
./gradlew assembleDebug    # Pour debug
./gradlew assembleRelease  # Pour release
```

L'APK sera dans `android/app/build/outputs/apk/`

## Build iOS (IPA)

### Via Xcode

1. Ouvrez Xcode
2. Ouvrez le workspace : `ios/App/App.xcworkspace`
3. Sélectionnez votre équipe de développement dans les paramètres du projet
4. Configurez le Bundle Identifier si nécessaire
5. Sélectionnez votre appareil ou simulateur
6. `Product > Archive`
7. Distribuez via App Store Connect ou Ad Hoc

## Configuration supplémentaire

### Permissions requises

#### Android (`android/app/src/main/AndroidManifest.xml`)
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

#### iOS (`ios/App/App/Info.plist`)
```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>L'app a besoin de votre position pour le tracking GPS en temps réel</string>
<key>NSLocationAlwaysUsageDescription</key>
<string>L'app a besoin de votre position en arrière-plan pour suivre vos courses</string>
```

### Icônes et Splash Screens

Placez vos icônes dans :
- Android : `android/app/src/main/res/mipmap-*/`
- iOS : `ios/App/App/Assets.xcassets/AppIcon.appiconset/`

## Testing

### Sur émulateur
```bash
npx cap run android
npx cap run ios
```

### Sur appareil physique
1. Connectez votre appareil
2. Activez le mode développeur (Android) ou approuvez le certificat (iOS)
3. Lancez avec la même commande

## Hot Reload en développement

Pour tester rapidement sans rebuild :

1. Commentez la ligne `url:` dans `capacitor.config.ts`
2. Lancez le serveur web : `npm run dev`
3. L'app chargera depuis localhost

Pour revenir au mode production, décommentez la ligne `url`.

## Troubleshooting

### Erreur de build Android
- Vérifiez Java JDK 11+
- Nettoyez le cache : `cd android && ./gradlew clean`
- Invalidez le cache Android Studio

### Erreur de build iOS
- Vérifiez que CocoaPods est à jour : `pod repo update`
- Nettoyez : `cd ios/App && xcodebuild clean`
- Supprimez le dossier `Pods/` et refaites `pod install`

### L'app ne se lance pas
- Vérifiez que `npm run build` s'est bien exécuté
- Exécutez `npx cap sync` après chaque modification du code web

## Publication

### Android - Google Play
1. Créez un compte Google Play Developer (25$ one-time)
2. Créez une fiche dans la Play Console
3. Uploadez votre AAB signé
4. Complétez les informations requises

### iOS - App Store
1. Créez un compte Apple Developer (99$/an)
2. Créez une fiche dans App Store Connect
3. Uploadez votre build via Xcode > Organizer
4. Soumettez pour révision

## Support

Pour toute question, consultez :
- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Documentation Android](https://developer.android.com)
- [Documentation iOS](https://developer.apple.com)
