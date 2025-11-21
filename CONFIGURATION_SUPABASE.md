# Configuration Supabase pour Driver VTC Dispatch

Ce guide explique les configurations optionnelles de Supabase pour l'application Driver VTC Dispatch.

---

## ✅ Ce qui est Déjà Configuré

### Politiques RLS (Sécurité) ✅

**Statut** : Configurées automatiquement via migration SQL

Les politiques de sécurité (Row Level Security) ont été appliquées automatiquement par la migration `supabase/migrations/20241116000000_setup_rls_policies.sql`.

**Tables sécurisées** :
- `drivers` : Les chauffeurs peuvent lire et modifier leur propre profil
- `courses` : Les chauffeurs peuvent lire leurs courses assignées et modifier leur statut
- `driver_notifications` : Les chauffeurs peuvent lire et recevoir leurs notifications
- `user_roles` : Lecture des rôles pour l'authentification

**Aucune action requise** - Les politiques RLS sont déjà actives.

---

### Base de Données ✅

**Statut** : Toutes les tables nécessaires sont créées et configurées

**Tables principales** :
- `drivers` : Profils des chauffeurs (avec colonnes `company_name`, `company_address`, `siret`, `profile_photo_url`, `company_logo_url`, `approved`)
- `courses` : Courses à effectuer
- `driver_notifications` : Notifications push et historique
- `user_roles` : Gestion des rôles (driver, fleet_manager, admin)

**Aucune action requise** - Les migrations ont été appliquées automatiquement.

---

### Firebase Cloud Messaging ✅

**Statut** : Configuré pour les notifications push

Le fichier `android/app/google-services.json` est présent et configuré avec :
- Project ID : `vtc-dispatch-admin`
- Package name : `com.lovable.drivervtcdispatch`
- API Key configurée

**Aucune action requise** - Les notifications push fonctionnent.

---

## 🔧 Configurations Optionnelles

### Google Maps API (Optionnel)

**Statut actuel** : Carte de fallback fonctionnelle ✅

L'application affiche actuellement une carte de fallback qui montre votre position GPS en temps réel. Cette solution fonctionne parfaitement et ne nécessite aucune configuration.

**Pour avoir une vraie Google Maps interactive** (optionnel) :

#### Étape 1 : Obtenir une clé API Google Maps

1. Aller sur : https://console.cloud.google.com/
2. Créer un nouveau projet ou sélectionner un projet existant
3. Activer l'API "Maps JavaScript API" :
   - Menu : APIs & Services → Library
   - Rechercher "Maps JavaScript API"
   - Cliquer sur "Enable"
4. Créer des identifiants :
   - APIs & Services → Credentials
   - Cliquer sur "Create Credentials" → "API Key"
   - Copier la clé générée (commence par `AIza...`)
5. **Important** : Restreindre la clé pour la sécurité :
   - Cliquer sur la clé créée
   - Section "Application restrictions" :
     - Sélectionner "HTTP referrers (web sites)"
     - Ajouter : `https://drivervtcdispatch.lovable.app/*`
   - Section "API restrictions" :
     - Sélectionner "Restrict key"
     - Cocher uniquement "Maps JavaScript API"
   - Cliquer sur "Save"

#### Étape 2 : Ajouter la clé dans Supabase

1. Aller sur votre dashboard Supabase : https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp
2. Menu de gauche : "Edge Functions"
3. En haut : Cliquer sur "Manage secrets"
4. Ajouter un nouveau secret :
   - **Name** : `GOOGLE_MAPS_API_KEY`
   - **Value** : Votre clé API (ex: `AIzaSyAbc123...`)
5. Cliquer sur "Create" ou "Add secret"

#### Étape 3 : Redéployer la fonction

1. Toujours dans "Edge Functions"
2. Trouver la fonction `get-google-maps-key`
3. Cliquer sur les 3 points (⋮) à droite de la fonction
4. Cliquer sur "Redeploy"
5. Attendre 30 secondes

#### Étape 4 : Tester

1. Aller sur https://drivervtcdispatch.lovable.app/
2. Se connecter
3. La carte Google Maps interactive devrait s'afficher à la place du fallback
4. Vérifier que vous pouvez zoomer, déplacer la carte, etc.

**Coût** : 
- Google Maps JavaScript API offre $200 de crédits gratuits par mois
- Pour une application chauffeur, cela représente environ 28 000 chargements de carte gratuits par mois
- Largement suffisant pour une petite flotte

---

## 🆘 Dépannage

### La clé API Google Maps ne fonctionne pas

**Vérifier** :
1. La clé est bien ajoutée dans Supabase Secrets (nom exact : `GOOGLE_MAPS_API_KEY`)
2. La fonction `get-google-maps-key` a été redéployée après l'ajout du secret
3. L'API "Maps JavaScript API" est bien activée dans Google Cloud Console
4. Les restrictions de la clé permettent l'accès depuis `drivervtcdispatch.lovable.app`

**Tester dans la console (F12)** :
```javascript
// Appeler directement la fonction pour voir la clé
const { data, error } = await supabase.functions.invoke('get-google-maps-key');
console.log('API Key:', data);
```

Si `data.apiKey` est vide ou undefined, le secret n'est pas configuré correctement.

---

### Erreur "RefererNotAllowedMapError"

**Cause** : La clé API est restreinte et le domaine actuel n'est pas autorisé.

**Solution** :
1. Aller dans Google Cloud Console → Credentials
2. Modifier la clé API
3. Ajouter ces domaines dans "HTTP referrers" :
   - `https://drivervtcdispatch.lovable.app/*`
   - `https://*.lovable.app/*` (pour les previews)
   - `http://localhost:*/*` (pour développement local)
4. Sauvegarder

---

### La carte de fallback s'affiche toujours

**Causes possibles** :
1. La clé API n'est pas configurée (comportement normal et voulu)
2. La clé API est invalide
3. La fonction `get-google-maps-key` n'a pas été redéployée

**Diagnostic** :
- Ouvrir la console (F12)
- Regarder les messages de GoogleMap.tsx
- Si vous voyez "Google Maps key is not configured", la clé n'est pas récupérée
- Si vous voyez une erreur API, la clé est invalide ou mal configurée

---

## 📋 Checklist de Configuration Google Maps

- [ ] Compte Google Cloud créé
- [ ] Projet créé dans Google Cloud Console
- [ ] API "Maps JavaScript API" activée
- [ ] Clé API créée
- [ ] Clé API restreinte (HTTP referrers + API restrictions)
- [ ] Secret `GOOGLE_MAPS_API_KEY` ajouté dans Supabase
- [ ] Fonction `get-google-maps-key` redéployée
- [ ] Test : Carte interactive s'affiche sur https://drivervtcdispatch.lovable.app/

---

## 📖 Ressources

### Documentation Google Maps
- Guide de démarrage : https://developers.google.com/maps/get-started
- Tarification : https://mapsplatform.google.com/pricing/
- Sécurité des clés API : https://developers.google.com/maps/api-security-best-practices

### Documentation Supabase
- Edge Functions : https://supabase.com/docs/guides/functions
- Secrets Management : https://supabase.com/docs/guides/functions/secrets

---

## 💡 Pourquoi Google Maps est Optionnel ?

La carte de fallback actuelle :
- ✅ Affiche votre position GPS en temps réel
- ✅ Montre les coordonnées latitude/longitude
- ✅ Permet de basculer EN LIGNE/HORS LIGNE
- ✅ Fonctionne sans configuration
- ✅ Pas de coûts supplémentaires

Google Maps ajoute :
- 🗺️ Carte interactive avec rues, bâtiments
- 🔍 Zoom et déplacement fluides
- 🏷️ Noms des lieux et adresses
- 🚗 Itinéraires (si intégré)

**Conclusion** : La carte de fallback est suffisante pour le fonctionnement de base. Google Maps améliore l'expérience utilisateur mais n'est pas critique.

---

**Note** : Ce guide sera mis à jour si de nouvelles configurations optionnelles sont ajoutées.
