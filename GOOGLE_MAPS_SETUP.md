# Configuration Google Maps API

## Étape 1 : Créer une clé API Google Maps

1. Allez sur [Google Cloud Console](https://console.cloud.google.com/)
2. Créez un nouveau projet ou sélectionnez un projet existant
3. Allez dans **APIs & Services** → **Credentials**
4. Cliquez sur **Create Credentials** → **API Key**
5. Copiez la clé générée

## Étape 2 : Activer les APIs nécessaires

Dans Google Cloud Console, activez ces APIs :
1. **Maps JavaScript API**
2. **Places API** (pour l'autocomplétion d'adresses)

Pour activer :
- **APIs & Services** → **Library**
- Recherchez chaque API
- Cliquez sur **Enable**

## Étape 3 : Restreindre la clé API (IMPORTANT pour la sécurité)

1. Dans **Credentials**, cliquez sur votre clé API
2. Sous **Application restrictions** :
   - Sélectionnez **HTTP referrers (web sites)**
   - Ajoutez ces domaines autorisés :
     ```
     https://4abdee7f-238d-436b-9d0d-34c8665e5ddf.lovableproject.com/*
     https://driver-dispatch-admin.lovable.app/*
     http://localhost:*
     ```

3. Sous **API restrictions** :
   - Sélectionnez **Restrict key**
   - Cochez :
     - Maps JavaScript API
     - Places API

4. Cliquez sur **Save**

## Étape 4 : Ajouter la clé dans Lovable Cloud

### Via l'interface Lovable

1. Ouvrez votre projet dans Lovable
2. Allez dans l'onglet **Cloud** (en haut)
3. Cliquez sur **Secrets** dans le menu de gauche
4. Cliquez sur **Add Secret**
5. Remplissez :
   - **Name** : `GOOGLE_MAPS_API_KEY`
   - **Value** : Collez votre clé API
6. Cliquez sur **Save**

### Vérification

La clé est maintenant disponible dans les edge functions via :
```typescript
const key = Deno.env.get('GOOGLE_MAPS_API_KEY');
```

L'edge function `get-google-maps-key` est déjà configurée pour la récupérer et l'envoyer au frontend de manière sécurisée.

## Étape 5 : Tester

1. Rechargez votre application
2. La carte devrait s'afficher sur la page d'accueil
3. Si vous voyez "Chargement de la carte..." qui persiste :
   - Ouvrez la Console (F12)
   - Vérifiez les erreurs dans l'onglet Console
   - Vérifiez l'onglet Network pour voir si la clé est bien récupérée

## Dépannage

### Erreur "RefererNotAllowedMapError"
- Vérifiez que vous avez bien ajouté les domaines dans les restrictions HTTP referrers
- Assurez-vous d'avoir mis `/*` à la fin de chaque URL

### La carte ne s'affiche pas
1. Vérifiez que les APIs sont activées (Maps JavaScript API + Places API)
2. Vérifiez que la clé est bien dans Cloud → Secrets
3. Vérifiez la console pour les erreurs JavaScript

### Erreur "This API key is not authorized"
- Vérifiez les restrictions API de votre clé
- Assurez-vous que Maps JavaScript API est sélectionnée

## Coût

Google Maps offre :
- **200$ de crédit gratuit par mois**
- Largement suffisant pour une application de VTC avec usage modéré
- Au-delà, les tarifs s'appliquent (environ 7$ pour 1000 chargements de carte)

## Sécurité

✅ **Bonnes pratiques appliquées** :
- La clé est stockée dans les secrets Lovable Cloud (chiffrée)
- La clé n'est jamais exposée dans le code frontend
- Les restrictions de domaine empêchent l'utilisation malveillante
- Les restrictions d'API limitent les abus

❌ **À éviter** :
- Ne mettez JAMAIS la clé directement dans le code
- Ne commitez JAMAIS la clé dans Git
- Ne partagez JAMAIS la clé publiquement

## Support

Si vous avez des problèmes :
1. Vérifiez la [documentation Google Maps](https://developers.google.com/maps/documentation)
2. Consultez les [quotas et tarifs](https://developers.google.com/maps/billing-and-pricing/pricing)
3. Vérifiez la console Lovable pour les erreurs backend
