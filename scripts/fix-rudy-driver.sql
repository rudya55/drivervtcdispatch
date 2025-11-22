-- ═══════════════════════════════════════════════════════════════════════════
-- VÉRIFICATION ET CORRECTION POUR : abitbol.rudy@orange.fr
-- ═══════════════════════════════════════════════════════════════════════════

-- ÉTAPE 1 : Vérifier si l'utilisateur existe dans auth.users
SELECT 
    '=== UTILISATEUR AUTH ===' as etape,
    id as user_id,
    email,
    created_at,
    email_confirmed_at,
    raw_user_meta_data
FROM auth.users
WHERE email = 'abitbol.rudy@orange.fr';

-- ÉTAPE 2 : Vérifier si le profil chauffeur existe
SELECT 
    '=== PROFIL CHAUFFEUR ===' as etape,
    d.id as driver_id,
    d.user_id,
    d.name,
    d.email,
    d.phone,
    d.status,
    d.approved,
    d.company_name,
    d.created_at
FROM drivers d
WHERE d.email = 'abitbol.rudy@orange.fr'
   OR d.user_id IN (SELECT id FROM auth.users WHERE email = 'abitbol.rudy@orange.fr');

-- ÉTAPE 3 : Si le profil n'existe pas, le créer
DO $$
DECLARE
    v_user_id uuid;
    v_driver_id uuid;
BEGIN
    -- Récupérer l'user_id
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'abitbol.rudy@orange.fr';

    IF v_user_id IS NULL THEN
        RAISE EXCEPTION 'Utilisateur abitbol.rudy@orange.fr non trouvé dans auth.users';
    END IF;

    -- Vérifier si le profil chauffeur existe
    SELECT id INTO v_driver_id
    FROM drivers
    WHERE user_id = v_user_id;

    IF v_driver_id IS NULL THEN
        -- Créer le profil chauffeur
        INSERT INTO drivers (
            user_id,
            name,
            email,
            phone,
            status,
            approved,
            company_name
        ) VALUES (
            v_user_id,
            'Rudy Abitbol',
            'abitbol.rudy@orange.fr',
            '',
            'inactive',
            true,  -- APPROUVÉ par défaut
            'VTC Rudy'
        ) RETURNING id INTO v_driver_id;

        RAISE NOTICE '✅ Profil chauffeur créé avec ID: %', v_driver_id;
    ELSE
        -- Mettre à jour pour s'assurer qu'il est approuvé
        UPDATE drivers
        SET 
            approved = true,
            name = 'Rudy Abitbol',
            email = 'abitbol.rudy@orange.fr'
        WHERE id = v_driver_id;

        RAISE NOTICE '✅ Profil chauffeur mis à jour avec ID: %', v_driver_id;
    END IF;
END $$;

-- ÉTAPE 4 : Vérifier le résultat final
SELECT 
    '=== RÉSULTAT FINAL ===' as etape,
    d.id as driver_id,
    d.user_id,
    d.name,
    d.email,
    d.phone,
    d.status,
    d.approved as est_approuve,
    d.company_name,
    d.created_at,
    u.email as email_auth
FROM drivers d
JOIN auth.users u ON u.id = d.user_id
WHERE d.email = 'abitbol.rudy@orange.fr'
   OR u.email = 'abitbol.rudy@orange.fr';

-- ÉTAPE 5 : Vérifier les courses de ce chauffeur
SELECT 
    '=== COURSES DU CHAUFFEUR ===' as etape,
    c.id as course_id,
    c.client_name,
    c.departure_location,
    c.destination_location,
    c.status,
    c.pickup_date,
    c.created_at
FROM courses c
JOIN drivers d ON d.id = c.driver_id
WHERE d.email = 'abitbol.rudy@orange.fr'
ORDER BY c.created_at DESC;
