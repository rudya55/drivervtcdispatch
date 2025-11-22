-- ═══════════════════════════════════════════════════════════════════════════
-- ACTIVER ET APPROUVER LE CHAUFFEUR : abitbol.rudy@orange.fr
-- ═══════════════════════════════════════════════════════════════════════════

-- AVANT : Voir l'état actuel
SELECT 
    '=== ÉTAT ACTUEL ===' as etape,
    id as driver_id,
    name,
    email,
    status,
    approved,
    company_id,
    created_at
FROM drivers
WHERE email = 'abitbol.rudy@orange.fr';

-- CORRECTION : Activer et approuver le chauffeur
UPDATE drivers
SET 
    approved = true,      -- ✅ APPROUVÉ
    status = 'active'     -- ✅ ACTIF
WHERE email = 'abitbol.rudy@orange.fr';

-- APRÈS : Vérifier le résultat
SELECT 
    '=== ÉTAT APRÈS CORRECTION ===' as etape,
    id as driver_id,
    name,
    email,
    status,
    approved,
    company_id,
    created_at
FROM drivers
WHERE email = 'abitbol.rudy@orange.fr';

-- BONUS : Afficher TOUS les chauffeurs (pour voir ce que l'app Flotte devrait voir)
SELECT 
    '=== TOUS LES CHAUFFEURS ===' as etape,
    id as driver_id,
    name,
    email,
    status,
    approved,
    company_name,
    created_at
FROM drivers
ORDER BY created_at DESC;
