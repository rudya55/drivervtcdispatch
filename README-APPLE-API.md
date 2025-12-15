# Configuration de l'API Apple pour les Tests

## Fichiers de Test Générés

### 1. `AuthKey_TEST12345.p8`
Fichier de clé privée de test pour l'API App Store Connect.

**⚠️ IMPORTANT**: Ce fichier contient une clé FICTIVE pour les tests uniquement. Pour la production, vous devez:
- Vous connecter à [App Store Connect](https://appstoreconnect.apple.com/access/api)
- Créer une clé API avec les permissions appropriées
- Télécharger le fichier `AuthKey_XXXXXXXXXX.p8` réel

### 2. `apple-api-config-test.json`
Configuration de test avec toutes les informations nécessaires pour l'intégration de l'API.

## Comment Obtenir vos Vraies Credentials

### Étape 1: Accéder à App Store Connect
1. Allez sur https://appstoreconnect.apple.com
2. Connectez-vous avec votre compte développeur Apple
3. Naviguez vers **Users and Access** > **Keys** (sous la section API)

### Étape 2: Créer une Clé API
1. Cliquez sur le bouton **+** ou "Generate API Key"
2. Donnez un nom à votre clé (ex: "Codemagic CI/CD")
3. Sélectionnez le rôle approprié:
   - **Admin**: Accès complet (recommandé pour CI/CD)
   - **App Manager**: Gestion des apps
   - **Developer**: Accès basique

### Étape 3: Télécharger et Noter les Informations
Une fois la clé créée, vous verrez:
- **Key ID**: Une chaîne de 10 caractères (ex: `ABC123DEFG`)
- **Issuer ID**: Un UUID (ex: `12345678-1234-1234-1234-123456789012`)
- **Download API Key**: Bouton pour télécharger le fichier `.p8`

**⚠️ IMPORTANT**: Vous ne pouvez télécharger le fichier `.p8` qu'une seule fois! Conservez-le en sécurité.

## Configuration dans Codemagic

### Variables d'Environnement à Configurer

Dans votre groupe de variables Codemagic (7GRRFYZ942), ajoutez:

```bash
APP_STORE_CONNECT_KEY_IDENTIFIER=<Votre Key ID>
APP_STORE_CONNECT_ISSUER_ID=<Votre Issuer ID>
APP_STORE_CONNECT_PRIVATE_KEY=<Contenu du fichier .p8>
```

### Comment Encoder la Clé Privée

```bash
# Option 1: Copier le contenu directement
cat AuthKey_XXXXXXXXXX.p8

# Option 2: Encoder en base64 (si nécessaire)
cat AuthKey_XXXXXXXXXX.p8 | base64

# Option 3: Utiliser comme variable d'environnement dans Codemagic
# Copiez simplement le contenu complet du fichier .p8 incluant
# -----BEGIN PRIVATE KEY----- et -----END PRIVATE KEY-----
```

## Vérification de la Configuration

Le fichier `codemagic.yaml` utilise déjà ces variables:

```yaml
publishing:
  app_store_connect:
    api_key: $APP_STORE_CONNECT_PRIVATE_KEY
    key_id: $APP_STORE_CONNECT_KEY_IDENTIFIER
    issuer_id: $APP_STORE_CONNECT_ISSUER_ID
```

## Test de l'API (Optionnel)

Pour tester que votre clé API fonctionne:

```bash
# Installer le CLI App Store Connect (optionnel)
npm install -g app-store-connect-cli

# Ou tester avec curl (nécessite de générer un JWT)
# Voir: https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests
```

## Sécurité

- ❌ **NE JAMAIS** commiter les fichiers `.p8` dans Git
- ❌ **NE JAMAIS** partager vos Key ID, Issuer ID ou clés privées publiquement
- ✅ Stocker les credentials dans les variables d'environnement sécurisées de Codemagic
- ✅ Limiter les permissions de la clé API au minimum nécessaire
- ✅ Révoquer et régénérer les clés si elles sont compromises

## Fichiers à Ignorer dans Git

Le `.gitignore` devrait contenir:

```
# Apple API Keys
AuthKey_*.p8
*.p8
apple-api-config.json
```

## Ressources

- [App Store Connect API Documentation](https://developer.apple.com/documentation/appstoreconnectapi)
- [Codemagic iOS Publishing Documentation](https://docs.codemagic.io/yaml-publishing/app-store-connect/)
- [Generating Tokens for API Requests](https://developer.apple.com/documentation/appstoreconnectapi/generating_tokens_for_api_requests)
