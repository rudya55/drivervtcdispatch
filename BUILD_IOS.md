# Configuration iOS pour l'Application VTC Dispatch

## Prérequis

- Un Mac avec macOS 10.15 (Catalina) ou supérieur
- Xcode 14+ installé depuis l'App Store
- Un compte Apple Developer (99$/an pour publier sur l'App Store)
- Node.js et npm installés
- CocoaPods installé (`sudo gem install cocoapods`)

## Étape 1 : Préparer le projet

1. **Exporter le projet vers GitHub**
   - Cliquez sur "Export to GitHub" dans Lovable
   - Clonez le projet sur votre Mac :
   ```bash
   git clone [votre-repo-github]
   cd [nom-du-projet]
   ```

2. **Installer les dépendances**
   ```bash
   npm install
   ```

3. **Construire le projet**
   ```bash
   npm run build
   ```

## Étape 2 : Ajouter la plateforme iOS

1. **Ajouter iOS à Capacitor**
   ```bash
   npx cap add ios
   ```

2. **Synchroniser les fichiers**
   ```bash
   npx cap sync ios
   ```

## Étape 3 : Configurer Xcode

1. **Ouvrir le projet dans Xcode**
   ```bash
   npx cap open ios
   ```

2. **Configurer l'identité de signature**
   - Dans Xcode, sélectionnez le projet "App" dans le navigateur
   - Allez dans l'onglet "Signing & Capabilities"
   - Cochez "Automatically manage signing"
   - Sélectionnez votre équipe de développement
   - Changez le "Bundle Identifier" si nécessaire (ex: com.votreentreprise.vtcdispatch)

3. **Configurer les permissions**
   
   Le fichier `ios/App/App/Info.plist` doit contenir les permissions suivantes :
   
   ```xml
   <key>NSLocationWhenInUseUsageDescription</key>
   <string>Nous avons besoin de votre position pour afficher les courses à proximité</string>
   
   <key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
   <string>Nous avons besoin de votre position même en arrière-plan pour suivre vos courses</string>
   
   <key>NSLocationAlwaysUsageDescription</key>
   <string>Nous avons besoin de votre position même en arrière-plan pour suivre vos courses</string>
   
   <key>NSCameraUsageDescription</key>
   <string>Nous avons besoin de la caméra pour prendre des photos de documents</string>
   
   <key>NSPhotoLibraryUsageDescription</key>
   <string>Nous avons besoin d'accéder à vos photos pour uploader des documents</string>
   
   <key>NSPhotoLibraryAddUsageDescription</key>
   <string>Nous avons besoin de sauvegarder des photos dans votre galerie</string>
   ```

4. **Configurer les icônes et splash screen**
   
   Placez vos icônes dans `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   
   Tailles requises :
   - 20x20 (@2x, @3x)
   - 29x29 (@2x, @3x)
   - 40x40 (@2x, @3x)
   - 60x60 (@2x, @3x)
   - 76x76 (@1x, @2x)
   - 83.5x83.5 (@2x)
   - 1024x1024 (@1x)

## Étape 4 : Configurer les capacités spéciales

1. **Background Modes** (pour le suivi GPS en arrière-plan)
   - Dans Xcode, onglet "Signing & Capabilities"
   - Cliquez sur "+ Capability"
   - Ajoutez "Background Modes"
   - Cochez :
     - Location updates
     - Background fetch
     - Remote notifications

2. **Push Notifications**
   - Ajoutez la capacité "Push Notifications"

## Étape 5 : Configuration Google Maps pour iOS

1. **Ajouter la clé API dans Info.plist**
   ```xml
   <key>GMSApiKey</key>
   <string>VOTRE_CLE_GOOGLE_MAPS</string>
   ```

2. **Restreindre la clé dans Google Cloud Console**
   - Allez dans Google Cloud Console
   - Sélectionnez votre clé API
   - Sous "Application restrictions", choisissez "iOS apps"
   - Ajoutez votre Bundle Identifier

## Étape 6 : Tester sur simulateur

```bash
# Lancer sur simulateur iPhone
npx cap run ios
```

Ou dans Xcode :
1. Sélectionnez un simulateur (ex: iPhone 14 Pro)
2. Cliquez sur le bouton Play (▶️)

## Étape 7 : Tester sur appareil physique

1. **Connecter votre iPhone au Mac**
2. **Faire confiance à l'ordinateur** sur l'iPhone
3. **Dans Xcode :**
   - Sélectionnez votre iPhone dans la liste des appareils
   - Cliquez sur Play (▶️)
4. **Sur l'iPhone :**
   - Allez dans Réglages > Général > Gestion des appareils
   - Faites confiance à votre compte développeur

## Étape 8 : Préparer pour TestFlight (test bêta)

1. **Archiver l'application**
   - Dans Xcode : Product > Archive
   - Attendez la fin de l'archivage

2. **Distribuer sur TestFlight**
   - Cliquez sur "Distribute App"
   - Sélectionnez "App Store Connect"
   - Suivez les étapes
   - Upload vers TestFlight

3. **Inviter des testeurs**
   - Allez sur App Store Connect
   - Sélectionnez votre app > TestFlight
   - Ajoutez des testeurs internes ou externes

## Étape 9 : Publication sur l'App Store

1. **Créer l'app sur App Store Connect**
   - Allez sur [App Store Connect](https://appstoreconnect.apple.com)
   - Créez une nouvelle app
   - Remplissez toutes les informations :
     - Nom de l'app
     - Description
     - Captures d'écran (obligatoires)
     - Catégorie : Navigation ou Voyages
     - Mots-clés
     - URL de support
     - Politique de confidentialité

2. **Soumettre pour révision**
   - Sélectionnez la build TestFlight
   - Cliquez sur "Submit for Review"
   - Répondez aux questions de conformité

3. **Révision Apple**
   - Durée : généralement 24-48h
   - Apple teste l'app et vérifie la conformité

## Mise à jour après modifications

Après chaque modification du code :

```bash
# 1. Reconstruire le web
npm run build

# 2. Synchroniser avec iOS
npx cap sync ios

# 3. Ouvrir dans Xcode
npx cap open ios

# 4. Tester et distribuer
```

## Dépannage

### Erreur de signature
- Vérifiez que votre compte Apple Developer est actif
- Essayez de décocher puis recocher "Automatically manage signing"

### Google Maps ne fonctionne pas
- Vérifiez que la clé API est bien dans Info.plist
- Vérifiez que les restrictions iOS sont bien configurées dans Google Cloud

### Crash au lancement
- Vérifiez les logs dans Xcode (View > Debug Area > Show Debug Area)
- Vérifiez que toutes les permissions sont bien configurées dans Info.plist

### L'app ne se lance pas sur appareil réel
- Vérifiez que l'appareil est bien enregistré dans votre compte développeur
- Allez dans Réglages > Général > Gestion des appareils et faites confiance

## Ressources

- [Documentation Capacitor iOS](https://capacitorjs.com/docs/ios)
- [Guide de distribution Apple](https://developer.apple.com/distribution/)
- [App Store Review Guidelines](https://developer.apple.com/app-store/review/guidelines/)
- [TestFlight Documentation](https://developer.apple.com/testflight/)

## Support

Pour toute question :
1. Consultez la documentation Capacitor
2. Vérifiez les logs Xcode
3. Consultez le forum Apple Developer
