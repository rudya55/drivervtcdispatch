-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC COMPLET : UTILISATEURS ET CHAUFFEURS
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Ce script affiche un diagnostic complet pour comprendre pourquoi
-- les chauffeurs n'apparaissent pas dans l'app Flotte
--
-- Instructions :
-- 1. Allez sur https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp/sql/new
-- 2. Copiez-collez ce script
-- 3. Cliquez sur "RUN"
-- 4. Envoyez-moi les résultats
--
-- ═══════════════════════════════════════════════════════════════════════════

-- 📊 RAPPORT 1 : Tous les utilisateurs inscrits
SELECT 
    '=== UTILISATEURS INSCRITS ===' as rapport,
    COUNT(*) as total_utilisateurs
FROM auth.users;

-- 📊 RAPPORT 2 : Tous les profils chauffeurs
SELECT 
    '=== PROFILS CHAUFFEURS ===' as rapport,
    COUNT(*) as total_chauffeurs,
    COUNT(CASE WHEN approved = true THEN 1 END) as chauffeurs_approuves,
    COUNT(CASE WHEN approved = false THEN 1 END) as chauffeurs_en_attente
FROM drivers;

-- 📊 RAPPORT 3 : Utilisateurs SANS profil chauffeur (PROBLÈME)
SELECT 
    '=== UTILISATEURS SANS PROFIL ===' as rapport,
    u.email,
    u.created_at,
    u.raw_user_meta_data->>'name' as nom_inscription
FROM auth.users u
LEFT JOIN drivers d ON d.user_id = u.id
WHERE d.id IS NULL
ORDER BY u.created_at DESC;

-- 📊 RAPPORT 4 : Détails de tous les chauffeurs
SELECT 
    '=== DÉTAILS CHAUFFEURS ===' as rapport,
    d.id as driver_id,
    d.name as nom,
    d.email,
    d.phone as telephone,
    d.status as statut,
    d.approved as approuve,
    d.company_name as societe,
    d.created_at as date_creation,
    u.email as email_auth
FROM drivers d
LEFT JOIN auth.users u ON u.id = d.user_id
ORDER BY d.created_at DESC;

-- 📊 RAPPORT 5 : Courses par chauffeur
SELECT 
    '=== COURSES PAR CHAUFFEUR ===' as rapport,
    d.name as chauffeur,
    d.email,
    COUNT(c.id) as nombre_courses,
    COUNT(CASE WHEN c.status = 'pending' THEN 1 END) as en_attente,
    COUNT(CASE WHEN c.status = 'accepted' THEN 1 END) as acceptees,
    COUNT(CASE WHEN c.status = 'in_progress' THEN 1 END) as en_cours,
    COUNT(CASE WHEN c.status = 'completed' THEN 1 END) as terminees
FROM drivers d
LEFT JOIN courses c ON c.driver_id = d.id
GROUP BY d.id, d.name, d.email
ORDER BY nombre_courses DESC;

-- 📊 RAPPORT 6 : Vérifier les politiques RLS sur la table drivers
SELECT 
    '=== POLITIQUES RLS DRIVERS ===' as rapport,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'drivers';
