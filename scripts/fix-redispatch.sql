-- ═══════════════════════════════════════════════════════════════════════════
-- DÉBLOQUER LE RE-DISPATCH - Permettre de réassigner les courses
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Voir l'état actuel des courses
SELECT 
    '=== COURSES ACTUELLES ===' as diagnostic,
    c.id as course_id,
    c.client_name,
    c.status,
    c.dispatch_mode,
    c.driver_id,
    d.name as driver_name,
    d.status as driver_status,
    c.pickup_date,
    c.created_at
FROM courses c
LEFT JOIN drivers d ON d.id = c.driver_id
ORDER BY c.created_at DESC
LIMIT 10;

-- 2. Voir tous les chauffeurs disponibles pour le dispatch
SELECT 
    '=== CHAUFFEURS DISPONIBLES ===' as diagnostic,
    d.id as driver_id,
    d.name,
    d.email,
    d.status,
    d.approved,
    d.company_id,
    COUNT(c.id) FILTER (WHERE c.status IN ('pending', 'accepted', 'in_progress')) as courses_actives
FROM drivers d
LEFT JOIN courses c ON c.driver_id = d.id AND c.status IN ('pending', 'accepted', 'in_progress')
GROUP BY d.id, d.name, d.email, d.status, d.approved, d.company_id
ORDER BY d.name;

-- 3. Mettre Rudy en statut "disponible" pour le re-dispatch
UPDATE drivers
SET 
    status = 'active',
    approved = true
WHERE email = 'abitbol.rudy@orange.fr';

-- 4. Si une course est bloquée, la remettre en mode "pending" pour permettre le re-dispatch
-- (Décommentez cette section si vous voulez réinitialiser une course spécifique)
/*
UPDATE courses
SET 
    status = 'pending',
    driver_id = NULL,
    dispatch_mode = 'manual'
WHERE id = 'ID_DE_LA_COURSE_A_REDISPATCHER';
*/

-- 5. Vérifier le résultat
SELECT 
    '=== RÉSULTAT FINAL ===' as diagnostic,
    d.id as driver_id,
    d.name,
    d.email,
    d.status,
    d.approved,
    COUNT(c.id) FILTER (WHERE c.status IN ('pending', 'accepted', 'in_progress')) as courses_actives
FROM drivers d
LEFT JOIN courses c ON c.driver_id = d.id AND c.status IN ('pending', 'accepted', 'in_progress')
WHERE d.email = 'abitbol.rudy@orange.fr'
GROUP BY d.id, d.name, d.email, d.status, d.approved;

-- 6. BONUS : Voir les politiques RLS sur la table courses
SELECT 
    '=== POLITIQUES RLS COURSES ===' as diagnostic,
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd
FROM pg_policies
WHERE tablename = 'courses';
