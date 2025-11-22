-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT POUR CRÉER LES PROFILS CHAUFFEURS MANQUANTS
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Ce script va :
-- 1. Lister tous les utilisateurs qui n'ont PAS de profil chauffeur
-- 2. Créer automatiquement leur profil dans la table drivers
--
-- Instructions :
-- 1. Allez sur https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp/sql/new
-- 2. Copiez-collez ce script
-- 3. Cliquez sur "RUN"
--
-- ═══════════════════════════════════════════════════════════════════════════

-- ÉTAPE 1 : Voir les utilisateurs sans profil chauffeur
SELECT 
    u.id as user_id,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'name' as name
FROM auth.users u
LEFT JOIN drivers d ON d.user_id = u.id
WHERE d.id IS NULL
ORDER BY u.created_at DESC;

-- ÉTAPE 2 : Créer les profils manquants
INSERT INTO drivers (
    user_id,
    name,
    email,
    phone,
    status,
    approved
)
SELECT 
    u.id,
    COALESCE(u.raw_user_meta_data->>'name', 'Chauffeur'),
    u.email,
    COALESCE(u.raw_user_meta_data->>'phone', ''),
    'inactive',
    false  -- Par défaut non approuvé, l'admin doit approuver
FROM auth.users u
LEFT JOIN drivers d ON d.user_id = u.id
WHERE d.id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- ÉTAPE 3 : Afficher tous les chauffeurs créés
SELECT 
    d.id,
    d.name,
    d.email,
    d.phone,
    d.status,
    d.approved,
    d.created_at
FROM drivers d
ORDER BY d.created_at DESC;
