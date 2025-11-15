import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qroqygbculbfqkbinqmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3F5Z2JjdWxiZnFrYmlucW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDUzNzYsImV4cCI6MjA3NTUyMTM3Nn0.C7fui8NfcJhY77ZTjtbxkCWsUimWFdD4MWEoIkXU7Zg';

async function createDemoAccount() {
  try {
    console.log('🚀 Tentative de création du compte de démonstration...\n');

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // Appeler la fonction Edge
    const { data, error } = await supabase.functions.invoke('create-demo-account');

    if (error) {
      console.error('❌ Erreur lors de l\'appel de la fonction:', error);

      // Si l'appel échoue, essayons de créer le compte manuellement
      console.log('\n⚠️  Tentative de création manuelle du compte...\n');
      await createManually(supabase);
      return;
    }

    console.log('✅ Compte de démonstration créé avec succès!\n');
    console.log('📧 Identifiants de connexion:');
    console.log('   Email:', data.credentials.email);
    console.log('   Mot de passe:', data.credentials.password);
    console.log('\n📊 Statistiques:');
    console.log('   Driver ID:', data.driver_id);
    console.log('   Courses créées:', data.courses_created);
    console.log('\n🎯 Vous pouvez maintenant vous connecter avec ces identifiants!');

  } catch (error) {
    console.error('❌ Erreur:', error.message);
    process.exit(1);
  }
}

async function createManually(supabase) {
  const demoEmail = 'demo@drivervtc.com';
  const demoPassword = 'Demo123!';

  try {
    // Se connecter ou créer l'utilisateur
    let session = null;

    // Essayer de se connecter d'abord
    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
      email: demoEmail,
      password: demoPassword,
    });

    if (signInError) {
      console.log('   Compte existant non trouvé, création nécessaire...');
      console.log('   ⚠️  Note: La création de compte nécessite les permissions admin.');
      console.log('   ℹ️  Utilisez le fichier create-demo.html dans votre navigateur');
      console.log('   ou contactez l\'administrateur pour créer le compte.');
      return;
    }

    session = signInData.session;
    console.log('✅ Connexion réussie au compte existant!');
    console.log('\n📧 Identifiants:');
    console.log('   Email:', demoEmail);
    console.log('   Mot de passe:', demoPassword);
    console.log('   User ID:', session.user.id);

    // Vérifier le profil driver
    const { data: driver } = await supabase
      .from('drivers')
      .select('*')
      .eq('user_id', session.user.id)
      .maybeSingle();

    if (driver) {
      console.log('   Driver ID:', driver.id);
      console.log('   Nom:', driver.name);

      // Compter les courses
      const { data: courses } = await supabase
        .from('courses')
        .select('id')
        .eq('driver_id', driver.id);

      console.log('   Courses existantes:', courses?.length || 0);
    }

    console.log('\n🎯 Vous pouvez utiliser ces identifiants pour vous connecter!');

  } catch (error) {
    console.error('❌ Erreur lors de la création manuelle:', error.message);
    throw error;
  }
}

createDemoAccount();
