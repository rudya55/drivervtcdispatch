# Guide d'utilisation du champ Extras

## 📋 Vue d'ensemble

Le champ **extras** permet d'afficher de manière très visible les équipements spéciaux requis pour une course (siège bébé, rehausseur, cosy, etc.).

## 🎯 Objectif

- **Visibilité maximale** : Les extras sont affichés dans une carte rose/pink avec une bordure épaisse
- **Séparation claire** : Les extras sont séparés des notes régulières
- **Icône distinctive** : Icône de bébé pour attirer l'attention
- **Alerte visuelle** : Mention "ÉQUIPEMENTS SPÉCIAUX REQUIS" en gras

## 🔧 Configuration de la base de données

### Étape 1 : Exécuter la migration SQL

1. Allez sur [Supabase Dashboard](https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp/sql/new)
2. Ouvrez le fichier `supabase/MIGRATION_REQUIRED.sql`
3. Copiez tout le contenu
4. Collez dans l'éditeur SQL de Supabase
5. Cliquez sur **RUN**

Cette migration ajoute la colonne `extras` à la table `courses`.

### Étape 2 : Vérifier la migration

Exécutez cette requête pour vérifier que la colonne existe :

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'courses'
AND column_name = 'extras';
```

## 📝 Utilisation dans l'application dispatch

### Créer une course avec extras

Lors de la création d'une course, remplissez le champ `extras` avec les équipements requis :

**Exemple 1 :**
```
Siège bébé + Rehausseur
```

**Exemple 2 :**
```
1x Siège auto groupe 1 (9-18kg)
1x Rehausseur avec dossier
```

**Exemple 3 :**
```
Cosy pour nouveau-né
```

### Format recommandé

- **Simple** : `Siège bébé`
- **Multiple** : `Siège bébé + Rehausseur + Cosy`
- **Détaillé** : `1x Siège auto groupe 2/3 + 1x Rehausseur`

## 🎨 Affichage dans l'application chauffeur

### Comment c'est affiché

Les extras apparaissent dans une **carte rose/pink distinctive** avec :

- 🎨 Fond rose clair avec bordure rose foncée
- 👶 Icône de bébé dans un cercle rose
- ⚠️ Icône d'alerte à côté du titre
- 📝 Texte en **gros caractères gras**
- 🔔 Titre : "ÉQUIPEMENTS SPÉCIAUX REQUIS"

### Détection automatique

Si le champ `extras` est vide mais que le champ `notes` contient l'un de ces mots-clés :
- siège
- rehausseur
- cosy
- bébé
- baby

→ Le système affichera automatiquement le contenu dans la section extras !

## 🔄 Migration des données existantes

Si vous avez déjà des courses avec des extras dans le champ `notes`, vous avez deux options :

### Option 1 : Laisser l'auto-détection

Ne faites rien ! Le système détectera automatiquement les mots-clés et affichera correctement.

### Option 2 : Migrer manuellement

Exécutez cette requête SQL pour déplacer les extras des notes vers le champ dédié :

```sql
-- Migrer les notes contenant des mots-clés d'extras
UPDATE courses
SET extras = notes,
    notes = NULL
WHERE notes IS NOT NULL
AND (
    notes ILIKE '%siège%' OR
    notes ILIKE '%rehausseur%' OR
    notes ILIKE '%cosy%' OR
    notes ILIKE '%bébé%' OR
    notes ILIKE '%baby%'
);
```

## 💡 Bonnes pratiques

### ✅ À faire

- Utiliser le champ `extras` pour les équipements spéciaux
- Être précis sur le type d'équipement
- Indiquer les quantités si nécessaire
- Séparer les extras des notes régulières

### ❌ À éviter

- Mettre les extras dans le champ `notes` (sauf si pas le choix)
- Utiliser des abréviations incompréhensibles
- Mélanger extras et informations de trajet

## 📱 Exemples visuels

### Avec le champ extras rempli :

```json
{
  "extras": "Siège bébé + Rehausseur",
  "notes": "Client VIP - Arrivée par le terminal 2E"
}
```

**Résultat** :
- ✅ Section EXTRAS rose très visible : "Siège bébé + Rehausseur"
- ✅ Section NOTES orange : "Client VIP - Arrivée par le terminal 2E"

### Avec auto-détection :

```json
{
  "extras": null,
  "notes": "Siège bébé requis"
}
```

**Résultat** :
- ✅ Section EXTRAS rose très visible : "Siège bébé requis"

### Sans extras :

```json
{
  "extras": null,
  "notes": "Rendez-vous au niveau des arrivées"
}
```

**Résultat** :
- ✅ Section NOTES orange : "Rendez-vous au niveau des arrivées"

## 🆘 Résolution de problèmes

### Les extras ne s'affichent pas

**Cause possible** : La colonne `extras` n'existe pas dans la base de données

**Solution** : Exécutez la migration SQL (voir Étape 1)

### Les extras sont affichés en double

**Cause possible** : Le champ `extras` ET le champ `notes` contiennent les mêmes informations

**Solution** : Videz le champ `notes` ou supprimez les mots-clés du champ `notes`

### Le texte est coupé

**Cause possible** : Le texte est trop long

**Solution** : Limitez le texte à 2-3 lignes maximum

## 📞 Support

Si vous avez des questions ou des problèmes, contactez le support technique.
