#!/usr/bin/env node

const SUPABASE_URL = 'https://qroqygbculbfqkbinqmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3F5Z2JjdWxiZnFrYmlucW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDUzNzYsImV4cCI6MjA3NTUyMTM3Nn0.C7fui8NfcJhY77ZTjtbxkCWsUimWFdD4MWEoIkXU7Zg';

async function createDemoAccount() {
  try {
    console.log('🚀 Création du compte de démonstration...\n');

    const response = await fetch(
      `${SUPABASE_URL}/functions/v1/create-demo-account`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
      }
    );

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Erreur lors de la création du compte');
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
    console.error('❌ Erreur:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

createDemoAccount();
