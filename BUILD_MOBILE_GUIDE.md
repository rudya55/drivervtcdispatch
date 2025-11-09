# 📱 Guide de Build Mobile - VTC Driver App

## 🎯 Application Mobile Native avec Capacitor

Cette application utilise **Capacitor** pour créer une vraie application mobile native avec :
- 📍 GPS en arrière-plan (background tracking)
- 🔔 Notifications push natives (FCM)
- 📲 Interface optimisée mobile
- ⚡ Performance native

---

## 📋 Prérequis

### Pour Android :
- ✅ **Android Studio** installé
- ✅ **JDK 17** ou supérieur
- ✅ **SDK Android 24+** (Android 7.0+)

### Pour iOS :
- ✅ **macOS** (obligatoire pour iOS)
- ✅ **Xcode 14+** installé
- ✅ **CocoaPods** installé (`sudo gem install cocoapods`)
- ✅ **Apple Developer Account** (pour distribuer sur App Store)

---

## 🚀 Étapes d'Installation

### 1️⃣ Transférer le projet sur GitHub

1. Cliquez sur **"Export to GitHub"** dans Lovable
2. Clonez votre dépôt GitHub sur votre machine :
```bash
git clone https://github.com/VOTRE-USERNAME/VOTRE-REPO.git
cd VOTRE-REPO
```

### 2️⃣ Installer les dépendances

```bash
npm install
```

### 3️⃣ Build le projet web

```bash
npm run build
```

### 4️⃣ Ajouter les plateformes natives

Pour **Android** :
```bash
npx cap add android
```

Pour **iOS** (macOS uniquement) :
```bash
npx cap add ios
npx cap update ios
cd ios/App
pod install
cd ../..
```

### 5️⃣ Synchroniser les fichiers

```bash
npx cap sync
```

---

## 📱 Configuration Android

### Permissions requises (déjà configurées)

Le fichier `android/app/src/main/AndroidManifest.xml` doit contenir :

```xml
<!-- Permissions GPS -->
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />

<!-- Permissions Notifications -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.INTERNET" />
```

### Configuration Firebase (Android)

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet **vtc-dispatch-admin**
3. Ajoutez une application Android :
   - **Package name** : `app.lovable.4abdee7f238d436b9d0d34c8665e5ddf`
   - Téléchargez `google-services.json`
4. Placez `google-services.json` dans `android/app/`

### Build Android

Ouvrez le projet dans Android Studio :
```bash
npx cap open android
```

Ou build en ligne de commande :
```bash
cd android
./gradlew assembleDebug  # Version debug
./gradlew assembleRelease  # Version release
```

L'APK sera dans : `android/app/build/outputs/apk/`

---

## 🍎 Configuration iOS

### Permissions requises (Info.plist)

Le fichier `ios/App/App/Info.plist` doit contenir :

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Nous utilisons votre position pour vous assigner des courses</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Nous suivons votre position en arrière-plan pendant vos courses</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Le suivi GPS en arrière-plan permet à vos clients de vous localiser</string>

<key>UIBackgroundModes</key>
<array>
  <string>location</string>
  <string>fetch</string>
  <string>remote-notification</string>
</array>
```

### Configuration Firebase (iOS)

1. Allez sur [Firebase Console](https://console.firebase.google.com/)
2. Sélectionnez votre projet **vtc-dispatch-admin**
3. Ajoutez une application iOS :
   - **Bundle ID** : `app.lovable.4abdee7f238d436b9d0d34c8665e5ddf`
   - Téléchargez `GoogleService-Info.plist`
4. Ouvrez Xcode :
```bash
npx cap open ios
```
5. Glissez `GoogleService-Info.plist` dans le projet Xcode (dossier `App/App`)

### Configuration Signing & Capabilities

Dans Xcode :
1. Sélectionnez le projet **App**
2. Onglet **Signing & Capabilities**
3. Sélectionnez votre **Team** (Apple Developer Account)
4. Activez les capacités :
   - ✅ **Background Modes** → Location updates
   - ✅ **Push Notifications**

### Build iOS

Dans Xcode :
1. Sélectionnez un simulateur ou un appareil connecté
2. Cliquez sur **Product → Run** (⌘R)

Pour distribuer :
1. **Product → Archive**
2. **Distribute App** → App Store Connect

---

## 🔄 Workflow de Développement

Après chaque modification du code :

```bash
# 1. Build le projet web
npm run build

# 2. Synchroniser avec les plateformes natives
npx cap sync

# 3. Ouvrir dans l'IDE natif
npx cap open android  # ou ios
```

### Hot Reload (Développement uniquement)

Pour tester rapidement sans rebuild :

1. Commentez la ligne `url` dans `capacitor.config.ts` :
```typescript
server: {
  // url: 'https://4abdee7f-238d-436b-9d0d-34c8665e5ddf.lovableproject.com?forceHideBadge=true',
  cleartext: true
},
```

2. Lancez le serveur de dev :
```bash
npm run dev
```

3. L'app mobile chargera depuis `localhost:8080`

⚠️ **Important** : Remettez l'`url` en production !

---

## 🧪 Tests

### Tester le GPS en arrière-plan (Android)

1. Build et installez l'APK
2. Activez le mode "En ligne" dans l'app
3. Mettez l'app en arrière-plan
4. Vérifiez les logs Android Studio → Logcat
5. Vérifiez la table `driver_locations` dans Supabase

### Tester les notifications push

1. Créez une course en mode "dispatched" depuis l'admin
2. Vérifiez que le chauffeur reçoit la notification
3. Testez en **foreground** (app ouverte) et **background** (app fermée)

---

## 📦 Publication

### Android (Google Play Store)

1. Créez un compte [Google Play Console](https://play.google.com/console/)
2. Générez un keystore signé :
```bash
cd android
./gradlew bundleRelease
```
3. Uploadez le fichier AAB sur Play Console

### iOS (App Store)

1. Créez un compte [Apple Developer](https://developer.apple.com/)
2. Archivez l'app dans Xcode (Product → Archive)
3. Distribuez via App Store Connect
4. Soumettez pour review

---

## 🐛 Dépannage

### Erreur "SDK location not found" (Android)
```bash
export ANDROID_HOME=$HOME/Library/Android/sdk  # macOS
export ANDROID_HOME=$HOME/Android/Sdk  # Linux
```

### Erreur "Pod install failed" (iOS)
```bash
cd ios/App
pod deintegrate
pod install
```

### Notifications ne marchent pas
- Vérifiez que `google-services.json` (Android) ou `GoogleService-Info.plist` (iOS) est bien ajouté
- Vérifiez les permissions dans `AndroidManifest.xml` ou `Info.plist`
- Vérifiez le FCM token dans la table `drivers`

### GPS ne fonctionne pas en arrière-plan
- Android : Vérifiez `ACCESS_BACKGROUND_LOCATION` dans le manifest
- iOS : Vérifiez `UIBackgroundModes` dans Info.plist
- Testez sur un vrai device (pas un émulateur)

---

## 📚 Ressources

- [Documentation Capacitor](https://capacitorjs.com/docs)
- [Capacitor Geolocation](https://capacitorjs.com/docs/apis/geolocation)
- [Capacitor Push Notifications](https://capacitorjs.com/docs/apis/push-notifications)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Android Studio](https://developer.android.com/studio)
- [Xcode](https://developer.apple.com/xcode/)

---

## ✅ Checklist Finale

Avant de publier l'app :

- [ ] GPS fonctionne en arrière-plan
- [ ] Notifications push fonctionnent (foreground + background)
- [ ] Swipe actions fonctionnent pour toutes les étapes
- [ ] Localisation s'affiche sur la carte admin
- [ ] Testez sur plusieurs appareils réels
- [ ] Vérifiez la consommation batterie
- [ ] Icônes et splash screen configurés
- [ ] Permissions expliquées clairement à l'utilisateur

---

🎉 **Votre app mobile VTC Driver est prête !**
