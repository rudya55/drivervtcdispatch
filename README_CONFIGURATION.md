# Configuration de l'Application Driver VTC Dispatch

## ✅ Ce qui a été fait

### 1. Nettoyage du code
- ✅ Suppression des fichiers de test (`InitDemo.tsx`, `SetupDatabase.tsx`)
- ✅ Suppression des routes inutiles
- ✅ Correction de l'erreur de build dans `Notifications.tsx`

### 2. Configuration mobile (iOS + Android)
- ✅ Installation de Capacitor (@capacitor/core, cli, ios, android)
- ✅ Création du fichier `capacitor.config.ts`
- ✅ Création du guide complet `BUILD_MOBILE.md`

### 3. Notifications en temps réel
- ✅ Listeners realtime sur la table `courses` activés
- ✅ Notifications instantanées quand une nouvelle course arrive
- ✅ Support des toasts en navigateur (fallback si FCM non disponible)

### 4. Tracking GPS
- ✅ Code de tracking GPS implémenté
- ✅ Position envoyée toutes les 5 secondes quand le driver est actif
- ✅ Table `driver_locations` prête à être créée

### 5. Permissions
- ✅ Demande de permission géolocalisation au démarrage
- ✅ Demande de permission notifications activée

## ⚠️ Actions requises de votre part

### 1. Corriger la base de données

**IMPORTANT** : La colonne `type` dans la table `drivers` bloque la création des profils.

**Solution 1 - Via l'app (Recommandé)** :
1. Allez dans **Paramètres**
2. Cliquez sur **"Corriger la base de données"**
3. Si ça ne fonctionne pas, passez à la solution 2

**Solution 2 - Manuellement** :
1. Allez dans **Cloud** → **Database** → **SQL Editor**
2. Exécutez ce SQL :
```sql
-- Supprimer la colonne type
ALTER TABLE drivers DROP CONSTRAINT IF EXISTS drivers_type_check;
ALTER TABLE drivers DROP COLUMN IF EXISTS type;

-- Créer la table pour le tracking GPS
CREATE TABLE IF NOT EXISTS driver_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  driver_id uuid REFERENCES drivers(id) ON DELETE CASCADE NOT NULL UNIQUE,
  latitude double precision NOT NULL,
  longitude double precision NOT NULL,
  heading double precision,
  speed double precision,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

ALTER TABLE driver_locations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drivers can update own location"
ON driver_locations FOR ALL TO authenticated
USING (driver_id IN (SELECT id FROM drivers WHERE user_id = auth.uid()));

CREATE POLICY "Authenticated users can view locations"
ON driver_locations FOR SELECT TO authenticated USING (true);

CREATE INDEX IF NOT EXISTS idx_driver_locations_driver_id ON driver_locations(driver_id);
ALTER PUBLICATION supabase_realtime ADD TABLE driver_locations;
```

### 2. Ajouter la clé Google Maps

La carte ne s'affiche pas car la clé Google Maps n'est pas configurée.

1. Allez dans **Cloud** → **Secrets**
2. Ajoutez un nouveau secret :
   - **Nom** : `GOOGLE_MAPS_API_KEY`
   - **Valeur** : Votre clé API Google Maps
3. Redémarrez l'application

### 3. Build mobile (iOS/Android)

Suivez le guide complet dans **BUILD_MOBILE.md** :

```bash
# 1. Exporter vers GitHub
# 2. Cloner le projet
git clone https://github.com/VOTRE_REPO.git

# 3. Installer les dépendances
npm install

# 4. Build du projet web
npm run build

# 5. Ajouter Android
npx cap add android
npx cap sync

# 6. Ouvrir dans Android Studio
npx cap open android

# 7. Build APK via Android Studio
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

Pour iOS (nécessite macOS + Xcode) :
```bash
npx cap add ios
cd ios/App && pod install && cd ../..
npx cap open ios
# Puis build via Xcode
```

## 📱 Fonctionnalités actives

### Côté Driver
- ✅ Connexion / Déconnexion
- ✅ Réception des courses en temps réel
- ✅ Accepter / Refuser des courses
- ✅ Timer de déblocage (1h avant pickup)
- ✅ Tracking GPS automatique quand actif
- ✅ Notifications en temps réel (toast + FCM si supporté)
- ✅ Gestion du profil, véhicule, documents
- ✅ Historique des courses

### Côté Admin (driver-dispatch-admin.lovable.app)
- ✅ Création et assignation de courses
- ✅ Réception en temps réel des positions GPS des drivers
- ✅ Gestion des tarifs et commissions

## 🔧 Structure du projet

```
/
├── src/
│   ├── components/     # Composants réutilisables
│   ├── hooks/         # Custom hooks (useAuth, useGeolocation, etc.)
│   ├── lib/           # Supabase, Firebase
│   ├── pages/         # Pages principales
│   └── types/         # Types TypeScript
├── supabase/
│   ├── functions/     # Edge functions (backend)
│   └── config.toml    # Configuration Supabase
├── capacitor.config.ts   # Config mobile
├── BUILD_MOBILE.md       # Guide de build mobile
└── README_CONFIGURATION.md  # Ce fichier
```

## 🐛 Troubleshooting

### L'app ne se connecte pas
- Vérifiez que vous avez exécuté le SQL pour supprimer `drivers.type`
- Vérifiez les logs : Console → Erreurs

### La carte ne s'affiche pas
- Ajoutez la clé Google Maps dans Cloud → Secrets
- Vérifiez que la clé a les restrictions correctes (domaine autorisé)

### Les notifications ne fonctionnent pas
- Sur iOS Safari : Les notifications FCM ne fonctionnent que si l'app est installée (Add to Home Screen)
- Sur Android : Fonctionne directement en navigateur
- En fallback, des toasts s'affichent dans tous les cas

### Le tracking GPS ne fonctionne pas
- Vérifiez que vous avez autorisé la géolocalisation
- Sur iOS, allez dans Réglages → Safari → Localisation
- Activez le statut "En ligne" dans l'app

## 📞 Support

- Documentation Lovable : https://docs.lovable.dev
- Documentation Capacitor : https://capacitorjs.com/docs
- Votre projet admin : https://driver-dispatch-admin.lovable.app

## 🚀 Prochaines étapes suggérées

1. Corriger la base de données (colonne `type`)
2. Ajouter la clé Google Maps
3. Tester l'app en ligne
4. Build APK pour Android
5. Distribuer aux chauffeurs

Tout est prêt pour que vous puissiez créer votre APK et distribuer l'application ! 🎉
