# Guide de Build iOS - Driver VTC Dispatch

## 📦 Prérequis

- **Mac avec macOS** (obligatoire pour iOS)
- **Xcode 15+** installé depuis l'App Store
- **Node.js 18+** installé
- **CocoaPods** installé : `sudo gem install cocoapods`
- **Compte Apple Developer** (99$/an pour publier sur l'App Store)

## 🚀 Configuration Initiale

### Étape 1 : Ajouter la plateforme iOS

```bash
# 1. Cloner le projet depuis GitHub
git clone https://github.com/VOTRE_USERNAME/VOTRE_REPO.git
cd VOTRE_REPO

# 2. Installer les dépendances
npm install --legacy-peer-deps

# 3. Build le projet web
npm run build

# 4. Ajouter iOS (si pas déjà fait)
npx cap add ios

# 5. Synchroniser avec Capacitor
npx cap sync ios

# 6. Installer les pods
cd ios/App
pod install
cd ../..
```

### Étape 2 : Ouvrir dans Xcode

```bash
npx cap open ios
```

## 🔧 Configuration Xcode

### 1. Signing & Capabilities

Dans Xcode :
1. Sélectionnez le projet "App" dans le navigateur
2. Allez dans l'onglet "Signing & Capabilities"
3. **Team** : Sélectionnez votre équipe Apple Developer
4. **Bundle Identifier** : `com.lovable.drivervtcdispatch`
5. Cochez "Automatically manage signing"

### 2. Ajouter les Capabilities

Cliquez sur "+ Capability" et ajoutez :
- **Background Modes** :
  - ✅ Location updates
  - ✅ Background fetch
  - ✅ Remote notifications
- **Push Notifications**

### 3. Info.plist - Permissions

Ouvrez `ios/App/App/Info.plist` et ajoutez :

```xml
<key>NSLocationWhenInUseUsageDescription</key>
<string>Cette app a besoin de votre position pour vous assigner des courses à proximité</string>

<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Cette app suit votre position en arrière-plan pour mettre à jour votre localisation pendant les courses</string>

<key>NSLocationAlwaysUsageDescription</key>
<string>Cette app a besoin d'accéder à votre position en permanence pour le suivi des courses</string>
```

## 📱 Build pour Test (Simulateur)

```bash
# Lancer sur le simulateur iPhone
npx cap run ios
```

Ou dans Xcode :
1. Sélectionnez un simulateur (ex: iPhone 15 Pro)
2. Appuyez sur le bouton ▶️ Play
3. Testez l'application !

## 📲 Build pour Appareil Physique

### Option 1 : Via Xcode (Simple)

1. Connectez votre iPhone avec un câble USB
2. Dans Xcode, sélectionnez votre iPhone dans la liste des appareils
3. Appuyez sur ▶️ Play
4. Première fois : Allez dans **Réglages > Général > Gestion des appareils** sur l'iPhone
5. Faites confiance à votre certificat de développeur

### Option 2 : TestFlight (Beta Testing)

1. Dans Xcode, configurez le build pour distribution
2. **Product > Archive**
3. Cliquez sur "Distribute App"
4. Sélectionnez "App Store Connect"
5. Sélectionnez "Upload"
6. Attendez le traitement par Apple (15-30 min)
7. Dans [App Store Connect](https://appstoreconnect.apple.com), ajoutez des testeurs
8. Les testeurs reçoivent un email pour installer via TestFlight

## 🏪 Publication sur l'App Store

### Étape 1 : Configurer Firebase (Notifications)

1. Allez sur [Firebase Console](https://console.firebase.google.com)
2. Ajoutez une application iOS
3. Bundle ID : `com.lovable.drivervtcdispatch`
4. Téléchargez `GoogleService-Info.plist`
5. Glissez-déposez dans Xcode sous `ios/App/App/`
6. **⚠️ Important** : Cochez "Copy items if needed"

### Étape 2 : Configuration APNs (Apple Push Notifications)

1. Allez sur [Apple Developer Portal](https://developer.apple.com/account)
2. **Certificates, IDs & Profiles** > **Keys**
3. Créez une nouvelle clé APNs
4. Téléchargez le fichier `.p8`
5. Dans Firebase Console > Project Settings > Cloud Messaging
6. Uploadez le fichier `.p8` dans la section iOS

### Étape 3 : Préparer la Release

Dans `capacitor.config.ts`, **commentez** la config de dev :

```typescript
const config: CapacitorConfig = {
  appId: 'com.lovable.drivervtcdispatch',
  appName: 'Driver VTC Dispatch',
  webDir: 'dist',
  // ⚠️ COMMENTEZ pour la production :
  // server: {
  //   url: 'https://4abdee7f-238d-436b-9d0d-34c8665e5ddf.lovableproject.com?forceHideBadge=true',
  //   cleartext: true
  // },
};
```

Puis rebuild :
```bash
npm run build
npx cap sync ios
```

### Étape 4 : Créer l'Archive

Dans Xcode :
1. Sélectionnez **Any iOS Device (arm64)** comme destination
2. **Product > Archive**
3. Attendez la fin de la compilation
4. Dans la fenêtre Archives, cliquez sur "Distribute App"

### Étape 5 : Uploader vers App Store Connect

1. Sélectionnez "App Store Connect"
2. Sélectionnez "Upload"
3. Laissez les options par défaut (Bitcode, symbols)
4. Cliquez sur "Upload"
5. Attendez le traitement (peut prendre 30-60 min)

### Étape 6 : Configurer dans App Store Connect

Allez sur [App Store Connect](https://appstoreconnect.apple.com) :

1. **Créer une nouvelle app** :
   - Nom : Driver VTC Dispatch
   - Langue principale : Français
   - Bundle ID : com.lovable.drivervtcdispatch
   - SKU : drivervtcdispatch

2. **Informations de l'app** :
   - Catégorie : Navigation ou Business
   - Description
   - Mots-clés
   - URL du site web de support

3. **Captures d'écran** :
   - iPhone 6.7" (iPhone 14 Pro Max)
   - iPhone 6.5" (iPhone 11 Pro Max)
   - iPad Pro 12.9" (optionnel)

4. **Build** :
   - Sélectionnez le build uploadé
   - Répondez aux questions de conformité

5. **Soumettre pour révision**

**⏱️ Délai d'approbation** : 24-48h en moyenne

## 🎨 Personnalisation

### Changer le nom de l'app

Dans Xcode :
1. Sélectionnez le projet "App"
2. Dans "General", changez "Display Name"

### Changer l'icône

1. Créez des icônes avec [AppIcon.co](https://appicon.co/)
2. Glissez-déposez dans `Assets.xcassets/AppIcon.appiconset`

### Changer le Splash Screen

Remplacez `ios/App/App/Assets.xcassets/Splash.imageset/splash.png`

## 📝 Checklist avant Publication

- [ ] Version incrémentée dans Xcode (ex: 1.0.0)
- [ ] Build number incrémenté (ex: 1, 2, 3...)
- [ ] URL de production configurée (pas de server.url en dev)
- [ ] `GoogleService-Info.plist` configuré
- [ ] APNs configuré dans Firebase
- [ ] Permissions déclarées dans Info.plist
- [ ] Testé sur appareil physique
- [ ] Captures d'écran prises
- [ ] Description et métadonnées préparées
- [ ] Compte Apple Developer actif (99$/an)

## 🐛 Dépannage

### Erreur "No provisioning profiles found"
- Allez dans Xcode > Preferences > Accounts
- Ajoutez votre compte Apple Developer
- Téléchargez les profils de provisioning

### Erreur de pods
```bash
cd ios/App
pod deintegrate
pod install
```

### Erreur de build
```bash
# Nettoyer le build
cd ios/App
xcodebuild clean
```

### Crash au démarrage
- Vérifiez les logs dans Xcode (Window > Devices and Simulators)
- Vérifiez que `GoogleService-Info.plist` est bien inclus

## 📚 Ressources

- [Capacitor iOS Docs](https://capacitorjs.com/docs/ios)
- [Apple Developer Portal](https://developer.apple.com)
- [App Store Connect](https://appstoreconnect.apple.com)
- [TestFlight](https://developer.apple.com/testflight/)
