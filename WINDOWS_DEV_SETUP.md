# Guide de Configuration Windows - DriverVTC Dispatch

Ce guide vous aidera à configurer votre environnement de développement sur Windows pour le projet DriverVTC Dispatch.

## Prérequis

### 1. Node.js et npm
- Téléchargez et installez Node.js (version 18 ou supérieure) : https://nodejs.org/
- Vérifiez l'installation :
  ```bash
  node --version
  npm --version
  ```

### 2. Git
- Téléchargez et installez Git : https://git-scm.com/download/win
- Configurez Git :
  ```bash
  git config --global user.name "Votre Nom"
  git config --global user.email "votre.email@example.com"
  ```

## Installation du Projet

### 1. Cloner le dépôt
```bash
git clone <URL_DU_DEPOT>
cd drivervtcdispatch
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Lancer le serveur de développement
```bash
npm run dev
```

L'application sera accessible sur `http://localhost:5173` (par défaut)

## Développement Web

Pour le développement web standard :

```bash
# Démarrer le serveur de développement
npm run dev

# Build de production
npm run build

# Prévisualiser le build
npm run preview

# Linter
npm run lint
```

## Développement Android (Optionnel)

Si vous souhaitez compiler pour Android sur Windows :

### 1. Installer Java JDK
- Téléchargez et installez JDK 17 ou supérieur : https://www.oracle.com/java/technologies/downloads/#java17
- Ajoutez `JAVA_HOME` aux variables d'environnement :
  - Exemple : `C:\Program Files\Java\jdk-17`

### 2. Installer Android Studio
- Téléchargez Android Studio : https://developer.android.com/studio
- Lors de l'installation, assurez-vous d'installer :
  - Android SDK
  - Android SDK Platform
  - Android Virtual Device (pour l'émulateur)

### 3. Configurer les variables d'environnement
Ajoutez ces variables d'environnement :
- `ANDROID_HOME` : `C:\Users\VotreNom\AppData\Local\Android\Sdk`
- Ajoutez au `PATH` :
  - `%ANDROID_HOME%\platform-tools`
  - `%ANDROID_HOME%\tools`

### 4. Synchroniser Capacitor
```bash
# Synchroniser les changements web vers Android
npx cap sync android

# Ouvrir le projet dans Android Studio
npx cap open android
```

### 5. Build Android
Dans Android Studio :
- Cliquez sur "Build" > "Build Bundle(s) / APK(s)" > "Build APK(s)"
- Ou exécutez depuis le terminal :
```bash
cd android
./gradlew assembleDebug  # Build debug
./gradlew assembleRelease  # Build release
```

## Structure du Projet

```
drivervtcdispatch/
├── src/                 # Code source React
├── public/             # Fichiers statiques
├── android/            # Projet Android Capacitor
├── supabase/           # Configuration Supabase
├── scripts/            # Scripts utilitaires
└── package.json        # Dépendances npm
```

## Configuration Supabase

Le projet utilise Supabase comme backend. Consultez `CONFIGURATION_SUPABASE.md` pour plus de détails.

## Scripts Disponibles

- `npm run dev` - Démarre le serveur de développement Vite
- `npm run build` - Build de production
- `npm run build:dev` - Build en mode développement
- `npm run preview` - Prévisualise le build de production
- `npm run lint` - Exécute ESLint

## Guides Supplémentaires

- `ANDROID_BUILD_GUIDE.md` - Guide complet pour Android
- `BUILD_QUICK_START.md` - Démarrage rapide
- `PROBLEMES_ET_SOLUTIONS.md` - Problèmes courants et solutions

## Problèmes Courants

### Erreur "npm install" échoue
- Essayez de supprimer `node_modules` et `package-lock.json`
- Réexécutez `npm install`

### Port déjà utilisé
- Modifiez le port dans `vite.config.ts` ou arrêtez le processus utilisant le port 5173

### Capacitor sync échoue
- Assurez-vous d'avoir fait un build web d'abord : `npm run build`
- Vérifiez que `capacitor.config.ts` est correctement configuré

## Support

Pour plus d'informations, consultez :
- Documentation Vite : https://vitejs.dev/
- Documentation Capacitor : https://capacitorjs.com/
- Documentation React : https://react.dev/

## Notes pour Windows

- Utilisez PowerShell ou Git Bash comme terminal
- Certains packages peuvent nécessiter des build tools : `npm install --global windows-build-tools` (si nécessaire)
- Pour les problèmes de permissions, exécutez votre terminal en tant qu'administrateur
