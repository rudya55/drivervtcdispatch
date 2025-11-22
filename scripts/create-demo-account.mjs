import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qroqygbculbfqkbinqmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3F5Z2JjdWxiZnFrYmlucW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDUzNzYsImV4cCI6MjA3NTUyMTM3Nn0.C7fui8NfcJhY77ZTjtbxkCWsUimWFdD4MWEoIkXU7Zg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createDemoAccount() {
    console.log('🚀 Démarrage de la création du compte démo...\n');

    try {
        const email = 'demo@vtcdispatch.fr';
        const password = 'Demo123456';

        // 1. Essayer de se connecter d'abord
        console.log('🔐 Tentative de connexion...');
        const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        let userId;

        if (signInError) {
            // Le compte n'existe pas, le créer
            console.log('📧 Création du compte utilisateur...');
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: 'Chauffeur Démo'
                    },
                    emailRedirectTo: undefined
                }
            });

            if (authError) throw authError;
            console.log('✅ Compte utilisateur créé');
            userId = authData.user.id;

            // Se connecter immédiatement
            console.log('🔐 Connexion au nouveau compte...');
            await supabase.auth.signInWithPassword({ email, password });
        } else {
            console.log('✅ Connecté au compte existant');
            userId = signInData.user.id;
        }

        console.log(`   User ID: ${userId}\n`);

        // 2. Vérifier si le profil chauffeur existe
        console.log('👤 Vérification du profil chauffeur...');
        const { data: existingDriver } = await supabase
            .from('drivers')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

        let driverId;

        if (existingDriver) {
            console.log('✅ Profil chauffeur existant trouvé');
            driverId = existingDriver.id;

            // Supprimer les anciennes courses
            console.log('🗑️  Suppression des anciennes courses...');
            await supabase.from('courses').delete().eq('driver_id', driverId);
            await supabase.from('driver_notifications').delete().eq('driver_id', driverId);
        } else {
            // Créer le profil chauffeur
            console.log('👤 Création du profil chauffeur...');
            const { data: driver, error: driverError } = await supabase
                .from('drivers')
                .insert({
                    user_id: userId,
                    name: 'Jean Dupont',
                    email: email,
                    phone: '+33 6 12 34 56 78',
                    status: 'inactive',
                    company_name: 'VTC Paris Premium',
                    company_address: '15 Avenue des Champs-Élysées, 75008 Paris',
                    siret: '123 456 789 00012',
                    approved: true
                })
                .select()
                .single();

            if (driverError) throw driverError;
            console.log('✅ Profil chauffeur créé');
            driverId = driver.id;
        }

        console.log(`   Driver ID: ${driverId}\n`);

        // 3. Créer les courses de démonstration
        console.log('🚗 Création des courses de démonstration...');

        const now = new Date();
        const courses = [
            {
                driver_id: driverId,
                client_name: 'Marie Martin',
                client_phone: '+33 6 98 76 54 32',
                departure_location: 'Gare du Nord, 75010 Paris',
                destination_location: 'Aéroport Charles de Gaulle, Terminal 2E',
                pickup_date: new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(),
                status: 'pending',
                client_price: 65.00,
                passengers_count: 2,
                luggage_count: 3,
                vehicle_type: 'berline'
            },
            {
                driver_id: driverId,
                client_name: 'Pierre Dubois',
                client_phone: '+33 6 45 67 89 01',
                departure_location: 'Tour Eiffel, 75007 Paris',
                destination_location: 'Musée du Louvre, 75001 Paris',
                pickup_date: new Date(now.getTime() + 4 * 60 * 60 * 1000).toISOString(),
                status: 'accepted',
                client_price: 25.00,
                passengers_count: 1,
                luggage_count: 0,
                vehicle_type: 'berline',
                accepted_at: new Date().toISOString()
            },
            {
                driver_id: driverId,
                client_name: 'Sophie Bernard',
                client_phone: '+33 6 23 45 67 89',
                departure_location: 'Gare de Lyon, 75012 Paris',
                destination_location: 'La Défense, 92400 Courbevoie',
                pickup_date: now.toISOString(),
                status: 'in_progress',
                client_price: 45.00,
                passengers_count: 1,
                luggage_count: 1,
                vehicle_type: 'berline',
                accepted_at: new Date(now.getTime() - 30 * 60 * 1000).toISOString(),
                started_at: new Date(now.getTime() - 15 * 60 * 1000).toISOString()
            },
            {
                driver_id: driverId,
                client_name: 'Thomas Petit',
                client_phone: '+33 6 87 65 43 21',
                departure_location: 'Opéra Garnier, 75009 Paris',
                destination_location: 'Montmartre, 75018 Paris',
                pickup_date: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                status: 'completed',
                client_price: 18.50,
                passengers_count: 2,
                luggage_count: 0,
                vehicle_type: 'berline',
                accepted_at: new Date(now.getTime() - 2 * 60 * 60 * 1000).toISOString(),
                started_at: new Date(now.getTime() - 1.5 * 60 * 60 * 1000).toISOString(),
                completed_at: new Date(now.getTime() - 1 * 60 * 60 * 1000).toISOString()
            },
            {
                driver_id: driverId,
                client_name: 'Isabelle Moreau',
                client_phone: '+33 6 11 22 33 44',
                departure_location: 'Gare Montparnasse, 75015 Paris',
                destination_location: 'Versailles, 78000',
                pickup_date: new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString(),
                status: 'cancelled',
                client_price: 55.00,
                passengers_count: 3,
                luggage_count: 2,
                vehicle_type: 'van'
            }
        ];

        const { data: createdCourses, error: coursesError } = await supabase
            .from('courses')
            .insert(courses)
            .select();

        if (coursesError) throw coursesError;
        console.log(`✅ ${createdCourses.length} courses créées`);

        // 4. Créer des notifications pour chaque course
        console.log('🔔 Création des notifications...');

        const notifications = createdCourses.map(course => ({
            driver_id: driverId,
            course_id: course.id,
            title: course.status === 'pending' ? 'Nouvelle course disponible' :
                course.status === 'accepted' ? 'Course acceptée' :
                    course.status === 'in_progress' ? 'Course en cours' :
                        course.status === 'completed' ? 'Course terminée' :
                            'Course annulée',
            message: `${course.client_name} - ${course.departure_location} → ${course.destination_location}`,
            type: 'course_update',
            read: course.status === 'completed' || course.status === 'cancelled'
        }));

        const { error: notifError } = await supabase
            .from('driver_notifications')
            .insert(notifications);

        if (notifError) throw notifError;
        console.log(`✅ ${notifications.length} notifications créées\n`);

        // 5. Afficher les identifiants
        console.log('═══════════════════════════════════════════════════');
        console.log('🎉 COMPTE DÉMO CRÉÉ AVEC SUCCÈS !');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        console.log('📧 Email      : demo@vtcdispatch.fr');
        console.log('🔑 Mot de passe : Demo123456');
        console.log('');
        console.log('🌐 Connectez-vous sur : https://drivervtcdispatch.lovable.app/');
        console.log('📱 Ou utilisez l\'APK sur votre téléphone');
        console.log('');
        console.log('═══════════════════════════════════════════════════');
        console.log('');
        console.log('📋 Courses créées :');
        console.log('   1. ⏳ EN ATTENTE    - Marie Martin (Gare du Nord → CDG)');
        console.log('   2. ✅ ACCEPTÉE      - Pierre Dubois (Tour Eiffel → Louvre)');
        console.log('   3. 🚗 EN COURS      - Sophie Bernard (Gare de Lyon → La Défense)');
        console.log('   4. ✔️  TERMINÉE     - Thomas Petit (Opéra → Montmartre)');
        console.log('   5. ❌ ANNULÉE       - Isabelle Moreau (Montparnasse → Versailles)');
        console.log('');

    } catch (error) {
        console.error('❌ Erreur:', error.message);
        console.error(error);
        process.exit(1);
    }
}

createDemoAccount();
