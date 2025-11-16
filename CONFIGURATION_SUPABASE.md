# Configuration Supabase pour Driver VTC Dispatch

Ce guide explique comment configurer correctement Supabase pour que l'application fonctionne parfaitement.

## 🔴 Problèmes actuels détectés

### 1. Le profil ne se sauvegarde pas
**Cause** : Les politiques RLS (Row Level Security) ne sont pas configurées correctement.

### 2. Google Maps ne s'affiche pas
**Cause** : La clé API Google Maps n'est pas configurée dans les variables d'environnement Supabase.

---

## 📋 Étape 1 : Configuration des politiques RLS

### Comment faire :

1. Allez sur votre projet Supabase : https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp

2. Dans le menu de gauche, cliquez sur **"SQL Editor"**

3. Cliquez sur **"New query"**

4. Copiez-collez **TOUT** le contenu du fichier `supabase/setup-rls-policies.sql`

5. Cliquez sur **"Run"** (ou appuyez sur Ctrl+Enter)

6. Vous devriez voir : **"Success. No rows returned"**

### ✅ Vérification

Pour vérifier que les politiques sont bien créées :

1. Allez dans **SQL Editor**
2. Exécutez cette requête :

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('drivers', 'courses', 'driver_notifications');
```

Vous devriez voir plusieurs politiques listées.

---

## 🗺️ Étape 2 : Configuration de Google Maps API

### Option A : Configurer une vraie clé API Google Maps (Recommandé)

1. **Obtenir une clé API Google Maps** :
   - Allez sur : https://console.cloud.google.com/
   - Créez un projet ou sélectionnez un projet existant
   - Activez l'API "Maps JavaScript API"
   - Créez des identifiants → Clé API
   - Copiez la clé générée

2. **Ajouter la clé dans Supabase** :
   - Allez sur votre projet Supabase : https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp
   - Dans le menu de gauche, cliquez sur **"Edge Functions"**
   - Cliquez sur **"Manage secrets"** ou **"Settings"**
   - Ajoutez une nouvelle variable d'environnement :
     - **Nom** : `GOOGLE_MAPS_API_KEY`
     - **Valeur** : Votre clé API Google Maps
   - Cliquez sur **"Save"**

3. **Redéployer les Edge Functions** :
   - Dans le menu Edge Functions, pour chaque fonction listée :
     - Cliquez sur les 3 points (⋮)
     - Cliquez sur **"Redeploy"**

### Option B : Utiliser une map de fallback (Temporaire)

Si vous ne voulez pas configurer Google Maps immédiatement, j'ai créé une version de fallback qui affiche une carte OpenStreetMap simple.

---

## 🧪 Étape 3 : Tester les corrections

Après avoir configuré les politiques RLS :

1. **Merger la Pull Request #6** sur GitHub
2. **Attendre 2-3 minutes** que Lovable se mette à jour
3. **Créer un nouveau compte** avec `reset-and-create-account.html`
4. **Se connecter** sur https://drivervtcdispatch.lovable.app/
5. **Tester le profil** :
   - Aller dans Paramètres → Profil
   - Modifier votre nom, téléphone, etc.
   - Cliquer sur "Sauvegarder"
   - ✅ Vous devriez voir "Profil mis à jour avec succès"

---

## 🆘 Problèmes courants

### "Permissions insuffisantes pour modifier le profil"
→ Les politiques RLS ne sont pas configurées. Suivez l'Étape 1.

### "Chargement de la carte..." sans fin
→ La clé API Google Maps n'est pas configurée. Suivez l'Étape 2.

### "Session expirée"
→ Déconnectez-vous et reconnectez-vous.

### Les modifications ne se sauvent pas
→ Vérifiez les politiques RLS ET créez un nouveau compte avec `reset-database`.

---

## 📞 Support

Si vous rencontrez toujours des problèmes après avoir suivi ce guide, vérifiez :

1. La console du navigateur (F12) pour voir les erreurs exactes
2. Les logs Supabase dans le dashboard
3. Que vous utilisez bien un compte créé APRÈS avoir configuré les RLS

---

## ✅ Checklist de configuration

- [ ] Politiques RLS configurées (Étape 1)
- [ ] Clé API Google Maps configurée (Étape 2)
- [ ] Edge Functions redéployées
- [ ] Pull Request #6 mergée sur GitHub
- [ ] Lovable mis à jour (attendre 2-3 min)
- [ ] Nouveau compte créé avec reset-database
- [ ] Tests du profil réussis
- [ ] Tests de la map réussis
