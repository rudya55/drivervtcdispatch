# 🔧 Guide de Configuration des Politiques RLS Supabase

## Pourquoi cette étape est nécessaire ?

Les politiques RLS (Row Level Security) permettent à votre application de sauvegarder les modifications du profil. Sans elles, vous verrez des erreurs de permissions.

## 📋 Étapes à suivre (5 minutes)

### Étape 1 : Ouvrir l'éditeur SQL Supabase

1. Cliquez sur ce lien : [Ouvrir Supabase SQL Editor](https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp/sql/new)
2. Vous devriez voir un éditeur SQL vide

### Étape 2 : Copier le code SQL

1. Ouvrez le fichier `supabase/setup-rls-policies.sql` dans votre projet
2. Sélectionnez **TOUT** le contenu (Ctrl+A)
3. Copiez-le (Ctrl+C)

> **Raccourci** : Le fichier contient 177 lignes de code SQL qui créent toutes les politiques de sécurité nécessaires.

### Étape 3 : Coller et exécuter

1. Retournez dans l'éditeur SQL Supabase
2. Collez le code SQL (Ctrl+V)
3. Cliquez sur le bouton **"Run"** (ou appuyez sur Ctrl+Enter)
4. Attendez quelques secondes

### Étape 4 : Vérifier le succès

Vous devriez voir un message :
```
✅ Success. No rows returned
```

C'est normal ! Cela signifie que les politiques ont été créées avec succès.

## 🧪 Vérification (Optionnel)

Pour vérifier que tout fonctionne, exécutez cette requête dans l'éditeur SQL :

```sql
SELECT tablename, policyname
FROM pg_policies
WHERE tablename IN ('drivers', 'courses', 'driver_notifications', 'driver_locations', 'course_tracking')
ORDER BY tablename, policyname;
```

Vous devriez voir plusieurs lignes avec les noms des politiques créées.

## ✅ C'est fait !

Une fois cette étape terminée :
- ✅ Votre profil pourra être sauvegardé
- ✅ Les modifications seront persistées dans la base de données
- ✅ Les permissions seront correctement appliquées

## 🆘 Problèmes ?

### Erreur "permission denied"
→ Assurez-vous d'être connecté avec le compte propriétaire du projet Supabase

### Erreur "relation does not exist"
→ Vérifiez que les tables existent dans votre base de données (onglet "Table Editor")

### Autre erreur
→ Copiez l'erreur et demandez de l'aide

---

**Après avoir terminé cette étape, revenez me dire "C'est fait" et je continuerai avec les autres corrections !**
