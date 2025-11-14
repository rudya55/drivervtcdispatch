# Configuration des Secrets GitHub pour CI (Android Build)

Ce fichier contient la liste des secrets à ajouter dans GitHub (nom exact + ce que vous devez coller).

Format :
- Name: `NOM_DU_SECRET`
  Secret *: ce que vous devez coller (valeur ou base64 selon indiqué)

---

- Name: `GOOGLE_SERVICES_JSON`
  Secret *: contenu EN BASE64 du fichier `android/app/google-services.json` (coller la longue chaîne base64, sans retours à la ligne)

- Name: `KEYSTORE_BASE64`
  Secret *: contenu EN BASE64 du fichier `android/app/upload-keystore.jks` (optionnel : nécessaire pour signer en CI)

- Name: `KEYSTORE_PASSWORD`
  Secret *: mot de passe du keystore

- Name: `KEY_ALIAS`
  Secret *: alias de la clé (ex: `upload`)

- Name: `KEY_PASSWORD`
  Secret *: mot de passe de la clé

- Name: `GOOGLE_MAPS_API_KEY`
  Secret *: clé API Google Maps (ex: `AIza...`) — optionnel

- Name: `FIREBASE_API_KEY`
  Secret *: `apiKey` Firebase (optionnel)

- Name: `FIREBASE_AUTH_DOMAIN`
  Secret *: `authDomain` Firebase (optionnel)

- Name: `FIREBASE_PROJECT_ID`
  Secret *: `projectId` Firebase (optionnel)

- Name: `FIREBASE_STORAGE_BUCKET`
  Secret *: `storageBucket` Firebase (optionnel)

- Name: `FIREBASE_MESSAGING_SENDER_ID`
  Secret *: `messagingSenderId` Firebase (optionnel)

- Name: `FIREBASE_APP_ID`
  Secret *: `appId` Firebase (optionnel)

- Name: `FIREBASE_VAPID_KEY`
  Secret *: clé VAPID pour FCM Web Push (optionnel)

---

Comment encoder les fichiers en base64 (Linux / macOS) :

```bash
# depuis la racine du projet
cat android/app/google-services.json | base64 | tr -d '\n'    # copie la sortie, collez-la dans GOOGLE_SERVICES_JSON
base64 android/app/upload-keystore.jks | tr -d '\n'           # collez dans KEYSTORE_BASE64
```

Windows PowerShell :
```powershell
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\\app\\google-services.json"))
[Convert]::ToBase64String([IO.File]::ReadAllBytes("android\\app\\upload-keystore.jks"))
```

Ajouter un secret via l'UI GitHub :
1. Repo → Settings → Secrets and variables → Actions → New repository secret
2. Mettre `Name` et coller la `Secret` correspondante

Ajouter les secrets via la CLI `gh` (optionnel) : exécuter le script `scripts/set-secrets.sh` fourni ci‑dessous.

---

Usage recommandé :

1. Placez `google-services.json` et (optionnel) `upload-keystore.jks` dans `android/app/` sur votre machine.
2. Exécutez :

```bash
chmod +x scripts/set-secrets.sh
bash scripts/set-secrets.sh
```

Le script propose d'envoyer automatiquement les secrets sur GitHub (il nécessite `gh` connecté et l'accès au dépôt local).

Si vous préférez copier manuellement, utilisez les commandes base64 plus haut et collez dans l'UI GitHub.

---

Sécurité : ne commitez jamais `google-services.json` ni `upload-keystore.jks` dans le dépôt. Stockez vos mots de passe keystore dans un gestionnaire de mots de passe.

---

Fichier fourni : `scripts/set-secrets.sh` — script qui encode et pousse les secrets via `gh`.
