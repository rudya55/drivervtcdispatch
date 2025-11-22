-- ═══════════════════════════════════════════════════════════════════════════
-- DIAGNOSTIC MODE DISPATCH - Pourquoi Rudy n'apparaît pas dans Missions
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Vérifier les informations complètes du chauffeur
SELECT 
    '=== PROFIL COMPLET RUDY ===' as diagnostic,
    d.id as driver_id,
    d.user_id,
    d.name,
    d.email,
    d.phone,
    d.status,
    d.approved,
    d.company_id,
    d.company_name,
    d.fcm_token,
    d.vehicle_brand,
    d.vehicle_model,
    d.vehicle_plate,
    d.created_at
FROM drivers d
WHERE d.email = 'abitbol.rudy@orange.fr';

-- 2. Vérifier s'il y a une table de positions/localisation
SELECT 
    '=== POSITION GPS ===' as diagnostic,
    dl.*
FROM driver_locations dl
JOIN drivers d ON d.id = dl.driver_id
WHERE d.email = 'abitbol.rudy@orange.fr'
ORDER BY dl.created_at DESC
LIMIT 5;

-- 3. Vérifier s'il existe une table companies
SELECT 
    '=== SOCIÉTÉS DISPONIBLES ===' as diagnostic,
    id as company_id,
    name as company_name,
    created_at
FROM companies
ORDER BY created_at DESC;

-- 4. Comparer avec d'autres chauffeurs (s'il y en a)
SELECT 
    '=== COMPARAISON AVEC AUTRES CHAUFFEURS ===' as diagnostic,
    d.id as driver_id,
    d.name,
    d.email,
    d.status,
    d.approved,
    d.company_id,
    CASE 
        WHEN d.company_id IS NULL THEN '❌ PAS DE SOCIÉTÉ'
        ELSE '✅ A UNE SOCIÉTÉ'
    END as a_company,
    d.created_at
FROM drivers d
ORDER BY d.created_at DESC;

-- 5. Vérifier les courses assignées à Rudy
SELECT 
    '=== COURSES DE RUDY ===' as diagnostic,
    c.id as course_id,
    c.client_name,
    c.status,
    c.pickup_date,
    c.driver_id,
    d.name as driver_name
FROM courses c
JOIN drivers d ON d.id = c.driver_id
WHERE d.email = 'abitbol.rudy@orange.fr'
ORDER BY c.created_at DESC;

-- 6. Vérifier toutes les courses (pour voir le format attendu)
SELECT 
    '=== TOUTES LES COURSES ===' as diagnostic,
    c.id as course_id,
    c.client_name,
    c.status,
    c.driver_id,
    d.name as driver_name,
    d.company_id,
    c.created_at
FROM courses c
LEFT JOIN drivers d ON d.id = c.driver_id
ORDER BY c.created_at DESC
LIMIT 10;
