-- ═══════════════════════════════════════════════════════════════════════════
-- SCRIPT SQL POUR CRÉER UN COMPTE DÉMO
-- ═══════════════════════════════════════════════════════════════════════════
-- 
-- Instructions :
-- 1. Allez sur https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp/sql/new
-- 2. Copiez-collez ce script complet
-- 3. Cliquez sur "RUN" en bas à droite
-- 4. Attendez quelques secondes
-- 5. Vous verrez "Success. No rows returned" si tout est OK
--
-- Identifiants du compte démo :
-- Email : demo@vtcdispatch.fr
-- Mot de passe : Demo123456
--
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Créer le compte utilisateur (si pas déjà existant)
DO $$
DECLARE
    v_user_id uuid;
    v_driver_id uuid;
BEGIN
    -- Vérifier si l'utilisateur existe déjà
    SELECT id INTO v_user_id
    FROM auth.users
    WHERE email = 'demo@vtcdispatch.fr';

    -- Si l'utilisateur n'existe pas, le créer
    IF v_user_id IS NULL THEN
        INSERT INTO auth.users (
            instance_id,
            id,
            aud,
            role,
            email,
            encrypted_password,
            email_confirmed_at,
            recovery_sent_at,
            last_sign_in_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            confirmation_token,
            email_change,
            email_change_token_new,
            recovery_token
        ) VALUES (
            '00000000-0000-0000-0000-000000000000',
            gen_random_uuid(),
            'authenticated',
            'authenticated',
            'demo@vtcdispatch.fr',
            crypt('Demo123456', gen_salt('bf')),
            NOW(),
            NOW(),
            NOW(),
            '{"provider":"email","providers":["email"]}',
            '{"name":"Chauffeur Démo"}',
            NOW(),
            NOW(),
            '',
            '',
            '',
            ''
        ) RETURNING id INTO v_user_id;

        RAISE NOTICE 'Utilisateur créé avec ID: %', v_user_id;
    ELSE
        RAISE NOTICE 'Utilisateur existant trouvé avec ID: %', v_user_id;
    END IF;

    -- 2. Vérifier si le profil chauffeur existe
    SELECT id INTO v_driver_id
    FROM drivers
    WHERE user_id = v_user_id;

    -- Supprimer les anciennes courses si le chauffeur existe
    IF v_driver_id IS NOT NULL THEN
        DELETE FROM driver_notifications WHERE driver_id = v_driver_id;
        DELETE FROM courses WHERE driver_id = v_driver_id;
        RAISE NOTICE 'Anciennes courses supprimées pour driver_id: %', v_driver_id;
    ELSE
        -- Créer le profil chauffeur
        INSERT INTO drivers (
            user_id,
            name,
            email,
            phone,
            status,
            company_name,
            company_address,
            siret,
            approved
        ) VALUES (
            v_user_id,
            'Jean Dupont',
            'demo@vtcdispatch.fr',
            '+33 6 12 34 56 78',
            'inactive',
            'VTC Paris Premium',
            '15 Avenue des Champs-Élysées, 75008 Paris',
            '123 456 789 00012',
            true
        ) RETURNING id INTO v_driver_id;

        RAISE NOTICE 'Profil chauffeur créé avec ID: %', v_driver_id;
    END IF;

    -- 3. Créer les courses de démonstration
    INSERT INTO courses (
        driver_id,
        client_name,
        client_phone,
        departure_location,
        destination_location,
        pickup_date,
        status,
        client_price,
        passengers_count,
        luggage_count,
        vehicle_type,
        accepted_at,
        started_at,
        completed_at
    ) VALUES
    -- Course EN ATTENTE
    (
        v_driver_id,
        'Marie Martin',
        '+33 6 98 76 54 32',
        'Gare du Nord, 75010 Paris',
        'Aéroport Charles de Gaulle, Terminal 2E',
        NOW() + INTERVAL '2 hours',
        'pending',
        65.00,
        2,
        3,
        'berline',
        NULL,
        NULL,
        NULL
    ),
    -- Course ACCEPTÉE
    (
        v_driver_id,
        'Pierre Dubois',
        '+33 6 45 67 89 01',
        'Tour Eiffel, 75007 Paris',
        'Musée du Louvre, 75001 Paris',
        NOW() + INTERVAL '4 hours',
        'accepted',
        25.00,
        1,
        0,
        'berline',
        NOW(),
        NULL,
        NULL
    ),
    -- Course EN COURS
    (
        v_driver_id,
        'Sophie Bernard',
        '+33 6 23 45 67 89',
        'Gare de Lyon, 75012 Paris',
        'La Défense, 92400 Courbevoie',
        NOW(),
        'in_progress',
        45.00,
        1,
        1,
        'berline',
        NOW() - INTERVAL '30 minutes',
        NOW() - INTERVAL '15 minutes',
        NULL
    ),
    -- Course TERMINÉE
    (
        v_driver_id,
        'Thomas Petit',
        '+33 6 87 65 43 21',
        'Opéra Garnier, 75009 Paris',
        'Montmartre, 75018 Paris',
        NOW() - INTERVAL '2 hours',
        'completed',
        18.50,
        2,
        0,
        'berline',
        NOW() - INTERVAL '2 hours',
        NOW() - INTERVAL '1.5 hours',
        NOW() - INTERVAL '1 hour'
    ),
    -- Course ANNULÉE
    (
        v_driver_id,
        'Isabelle Moreau',
        '+33 6 11 22 33 44',
        'Gare Montparnasse, 75015 Paris',
        'Versailles, 78000',
        NOW() - INTERVAL '3 hours',
        'cancelled',
        55.00,
        3,
        2,
        'van',
        NULL,
        NULL,
        NULL
    );

    RAISE NOTICE '5 courses créées';

    -- 4. Créer les notifications
    INSERT INTO driver_notifications (driver_id, course_id, title, message, type, read)
    SELECT 
        c.driver_id,
        c.id,
        CASE c.status
            WHEN 'pending' THEN 'Nouvelle course disponible'
            WHEN 'accepted' THEN 'Course acceptée'
            WHEN 'in_progress' THEN 'Course en cours'
            WHEN 'completed' THEN 'Course terminée'
            ELSE 'Course annulée'
        END,
        c.client_name || ' - ' || c.departure_location || ' → ' || c.destination_location,
        'course_update',
        c.status IN ('completed', 'cancelled')
    FROM courses c
    WHERE c.driver_id = v_driver_id;

    RAISE NOTICE '5 notifications créées';

    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '🎉 COMPTE DÉMO CRÉÉ AVEC SUCCÈS !';
    RAISE NOTICE '═══════════════════════════════════════════════════';
    RAISE NOTICE '';
    RAISE NOTICE '📧 Email      : demo@vtcdispatch.fr';
    RAISE NOTICE '🔑 Mot de passe : Demo123456';
    RAISE NOTICE '';
    RAISE NOTICE '🌐 Connectez-vous sur : https://drivervtcdispatch.lovable.app/';
    RAISE NOTICE '📱 Ou utilisez l APK sur votre téléphone';
    RAISE NOTICE '';
    RAISE NOTICE '═══════════════════════════════════════════════════';

END $$;
