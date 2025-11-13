# 🚀 Quick Start - Build Mobile Apps

## 📱 Test Rapide (APK Android)

### Via GitHub Actions (Le plus simple) ⭐

1. Exportez votre projet vers GitHub (bouton "Export to GitHub" dans Lovable)
2. Allez dans l'onglet **Actions** de votre repo GitHub
3. Cliquez sur **"Build Android APK"**
4. Cliquez sur **"Run workflow"**
5. Attendez 5-10 minutes
6. Téléchargez l'APK dans **Artifacts**
7. Transférez sur votre téléphone Android et installez !

### Build Local Android

```bash
git clone VOTRE_REPO
cd VOTRE_REPO
npm install --legacy-peer-deps
npm run build
npx cap sync android
cd android
./gradlew assembleDebug
```

APK disponible dans : `android/app/build/outputs/apk/debug/app-debug.apk`

## 🍎 Test iOS (Mac uniquement)

```bash
git clone VOTRE_REPO
cd VOTRE_REPO
npm install --legacy-peer-deps
npm run build
npx cap add ios  # Première fois seulement
npx cap sync ios
npx cap open ios
```

Dans Xcode : Sélectionnez un simulateur et cliquez sur ▶️

## 📚 Documentation Complète

- **Android** : Voir `ANDROID_BUILD_GUIDE.md`
- **iOS** : Voir `IOS_BUILD_GUIDE.md`

## ⚠️ Important pour Production

Avant de publier, dans `capacitor.config.ts`, commentez :

```typescript
// server: {
//   url: 'https://...',
//   cleartext: true
// },
```

Cela force l'app à utiliser les fichiers buildés au lieu du serveur de dev.
