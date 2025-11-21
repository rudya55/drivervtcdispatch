# 📱 Driver VTC Dispatch - Build Status

## ✅ État Actuel de l'Application

L'application est **fonctionnelle** et prête à être testée. Voici ce qui fonctionne actuellement :

---

## 🚀 Fonctionnalités Principales

### ✅ Authentification
- Inscription avec email, mot de passe, nom et téléphone
- Connexion avec validation du compte
- Système d'approbation des chauffeurs (nouveaux comptes en attente d'approbation admin)
- Récupération de mot de passe

### ✅ Profil Chauffeur
- Modification du profil complet (nom, téléphone, photo, etc.)
- Informations société (nom, adresse, SIRET)
- Upload de logo société
- **Sauvegarde robuste avec triple fallback**

### ✅ Géolocalisation
- Position GPS en temps réel
- Mise à jour automatique de la position (toutes les secondes)
- Tracking en arrière-plan (application fermée)
- Carte avec fallback si Google Maps non configuré

### ✅ Gestion des Courses
- Réception des courses dispatchées
- Interface swipe pour gérer les étapes (Démarrer → Sur place → Client à bord → Client déposé → Terminer)
- Historique des courses
- Notifications push natives (Android/iOS)

### ✅ Notifications
- Notifications push natives via Firebase Cloud Messaging
- Notifications pour nouvelles courses (respect du mode dispatch auto/manual)
- Historique des notifications

### ✅ Paramètres
- Profil personnel
- Véhicule
- Documents (permis, carte pro, assurance)
- Compte bancaire
- Préférences de notifications

---

## 📱 Builds Mobiles

### Android APK/AAB

**Statut** : ✅ Workflow GitHub Actions fonctionnel

**Comment obtenir l'APK** :

1. **Pousser les modifications sur GitHub** :
   - Les modifications sont automatiquement synchronisées via l'intégration GitHub de Lovable

2. **Lancer le workflow manuellement** :
   - Aller sur : https://github.com/rudya55/drivervtcdispatch/actions
   - Cliquer sur "Build Android APK/AAB"
   - Cliquer sur "Run workflow"
   - Sélectionner :
     - **Branch** : `main`
     - **Build type** : `release` (ou `debug` pour test rapide)
   - Cliquer sur "Run workflow"

3. **Télécharger les artifacts** :
   - Attendre 5-10 minutes que le build se termine
   - Cliquer sur le workflow terminé
   - Descendre jusqu'à la section "Artifacts"
   - Télécharger :
     - **app-release.apk** : Pour installation directe sur téléphone Android
     - **app-release.aab** : Pour publication sur Google Play Store (si keystore configurée)
     - **app-debug.apk** : Version debug pour tests rapides

**Note sur la signature** :
- Le build release nécessite une keystore pour la signature (obligatoire pour Play Store)
- Si la keystore n'est pas configurée dans les secrets GitHub, un APK debug sera généré (testable mais non publiable)
- Voir section "Configuration de la Keystore" ci-dessous

---

## 🔧 Configuration Optionnelle

### Google Maps API (Optionnel)

**Statut actuel** : Carte de fallback fonctionnelle ✅

L'application affiche actuellement une carte de fallback qui montre :
- Votre position GPS en temps réel
- Les coordonnées latitude/longitude
- Le bouton EN LIGNE/HORS LIGNE fonctionne parfaitement

**Pour avoir une vraie Google Maps interactive** (optionnel) :

1. Obtenir une clé API :
   - https://console.cloud.google.com/
   - Créer un projet
   - Activer "Maps JavaScript API"
   - Créer une clé API

2. Configurer dans Supabase :
   - Dashboard → Edge Functions → Manage Secrets
   - Ajouter : `GOOGLE_MAPS_API_KEY` = votre clé
   - Redéployer la fonction `get-google-maps-key`

---

### Keystore Android (Pour publication Play Store)

**Statut** : Configuration manuelle requise

**Ce que c'est** :
Une keystore est nécessaire pour signer l'application Android en mode release et la publier sur le Google Play Store.

**Comment configurer** :

1. **Générer une keystore** (nécessite un ordinateur avec Java) :
   ```bash
   keytool -genkey -v -keystore upload-keystore.jks \
     -keyalg RSA -keysize 2048 -validity 10000 \
     -alias upload
   ```

2. **Encoder en base64** :
   ```bash
   base64 -i upload-keystore.jks -o keystore-base64.txt
   ```

3. **Ajouter dans GitHub Secrets** :
   - Aller sur : https://github.com/rudya55/drivervtcdispatch/settings/secrets/actions
   - Ajouter ces 4 secrets :
     - `KEYSTORE_BASE64` : Contenu du fichier keystore-base64.txt
     - `KEYSTORE_PASSWORD` : Mot de passe du keystore
     - `KEY_ALIAS` : `upload` (ou l'alias que vous avez choisi)
     - `KEY_PASSWORD` : Mot de passe de la clé

4. **Relancer le build release** :
   - Le workflow détectera automatiquement les secrets
   - Un APK/AAB signé sera généré

**Alternative temporaire** :
- Utiliser `build_type: debug` pour générer un APK debug testable immédiatement
- Configurer la keystore plus tard quand vous serez prêt à publier

---

## 📋 Base de Données

### Politiques RLS (Sécurité)

**Statut** : ✅ Configurées automatiquement via migration

Les politiques de sécurité (Row Level Security) ont été configurées automatiquement via la migration SQL `supabase/migrations/20241116000000_setup_rls_policies.sql`.

**Tables configurées** :
- `drivers` : CRUD complet pour les chauffeurs authentifiés
- `courses` : Lecture des courses assignées, modification du statut
- `driver_notifications` : Lecture/insertion des notifications
- `user_roles` : Lecture des rôles utilisateur

---

## 🧪 Testing

### PWA (Progressive Web App)

**Statut** : ✅ Configurée

L'application peut être installée comme PWA directement depuis le navigateur :

1. Ouvrir https://drivervtcdispatch.lovable.app/
2. Sur mobile : Menu navigateur → "Ajouter à l'écran d'accueil"
3. L'icône de l'app apparaîtra sur votre écran d'accueil

**Avantages PWA** :
- Installation instantanée sans Play Store
- Pas besoin de générer d'APK
- Mises à jour automatiques
- Fonctionne hors ligne (partiellement)

**Limitations PWA** :
- Pas de tracking GPS en arrière-plan
- Notifications push limitées sur iOS
- Performances légèrement inférieures à l'app native

---

## 🐛 Débogage

### Console Navigateur (F12)

Pour diagnostiquer les problèmes :
1. Ouvrir l'application dans le navigateur
2. Appuyer sur F12 (ou Cmd+Option+I sur Mac)
3. Aller dans l'onglet "Console"
4. Reproduire le problème
5. Lire les messages d'erreur (en rouge)

### Logs Supabase

Pour voir les logs backend :
1. Dashboard Supabase : https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp
2. Menu "Logs" → "Edge Functions"
3. Filtrer par fonction si nécessaire

---

## 📞 Support

### Problèmes Courants

**"Compte en attente de validation"** :
- Les nouveaux comptes doivent être approuvés par un admin
- Contactez l'administrateur du système

**"Profil ne se sauvegarde pas"** :
- Vérifier que vous êtes bien connecté (session valide)
- Ouvrir la console (F12) pour voir l'erreur exacte
- Les RLS devraient être configurées automatiquement

**"Google Maps ne s'affiche pas"** :
- C'est normal ! Une carte de fallback est affichée à la place
- Pour avoir Google Maps, configurer la clé API (voir ci-dessus)

**"Build GitHub Actions échoue"** :
- Vérifier les logs du workflow dans l'onglet Actions
- Chercher "FAILURE: Build failed with an exception"
- Partager l'erreur exacte pour diagnostic

---

## 🎯 Checklist de Déploiement

### Pour Tester Localement (PWA)
- [x] Application fonctionnelle sur https://drivervtcdispatch.lovable.app/
- [x] Inscription/Connexion fonctionnelle
- [x] Carte de fallback avec GPS
- [x] Profil sauvegardable
- [ ] Installer comme PWA sur mobile
- [ ] Tester les notifications push

### Pour Générer l'APK Android
- [x] Code poussé sur GitHub
- [x] Workflow GitHub Actions configuré
- [ ] Lancer le workflow manuellement
- [ ] Télécharger l'artifact app-release.apk ou app-debug.apk
- [ ] Installer sur un téléphone Android

### Pour Publier sur Play Store (Optionnel)
- [ ] Générer une keystore
- [ ] Configurer les secrets GitHub
- [ ] Générer un AAB signé
- [ ] Créer un compte Google Play Developer
- [ ] Uploader l'AAB sur Play Store
- [ ] Soumettre pour review

---

## 📊 Résumé

| Fonctionnalité | Statut | Action Requise |
|----------------|--------|----------------|
| Application Web | ✅ Fonctionnelle | Aucune |
| PWA | ✅ Installable | Aucune |
| Build Android Debug | ✅ Disponible | Lancer workflow |
| Build Android Release | 🔧 Nécessite keystore | Configurer secrets |
| Google Maps | 🔧 Fallback fonctionnel | Clé API optionnelle |
| Notifications Push | ✅ Configurées | Aucune |
| Base de Données | ✅ Sécurisée | Aucune |

---

**Dernière mise à jour** : Workflow GitHub Actions corrigé pour supporter tous les types de déclenchement (push, PR, manual).
