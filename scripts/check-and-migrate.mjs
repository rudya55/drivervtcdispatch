#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://qroqygbculbfqkbinqmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3F5Z2JjdWxiZnFrYmlucW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDUzNzYsImV4cCI6MjA3NTUyMTM3Nn0.C7fui8NfcJhY77ZTjtbxkCWsUimWFdD4MWEoIkXU7Zg';

console.log('🔍 Vérification de la structure de la base de données...\n');

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkColumns() {
  try {
    // Récupérer une course pour voir quelles colonnes existent
    const { data: courses, error } = await supabase
      .from('courses')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erreur lors de la récupération des courses:', error.message);
      return;
    }

    if (!courses || courses.length === 0) {
      console.log('⚠️  Aucune course trouvée dans la base de données');
      console.log('   Créez une course depuis l\'application dispatch pour tester\n');
      return;
    }

    const course = courses[0];
    console.log('✅ Course trouvée:', course.client_name);
    console.log('\n📊 Colonnes disponibles:');

    const columns = Object.keys(course);
    const requiredColumns = ['flight_number', 'extras', 'dispatch_mode', 'company_name'];

    let allPresent = true;
    for (const col of requiredColumns) {
      const exists = columns.includes(col);
      const status = exists ? '✅' : '❌';
      console.log(`   ${status} ${col}: ${exists ? 'PRÉSENT' : 'MANQUANT'}`);
      if (!exists) allPresent = false;
    }

    console.log('\n📋 État actuel des données:');
    console.log(`   - Numéro de vol: ${course.flight_number || '(non renseigné)'}`);
    console.log(`   - Extras: ${course.extras || '(non renseigné)'}`);
    console.log(`   - Notes: ${course.notes || '(non renseigné)'}`);
    console.log(`   - Nom compagnie: ${course.company_name || '(non renseigné)'}`);

    if (allPresent) {
      console.log('\n✅ Toutes les colonnes nécessaires sont présentes!');
      console.log('\n💡 Si vous ne voyez pas le numéro de vol ou les extras:');
      console.log('   1. Créez une NOUVELLE course depuis l\'application dispatch');
      console.log('   2. Renseignez le champ "flight_number" avec un numéro de vol (ex: AF1234)');
      console.log('   3. Renseignez le champ "extras" avec les équipements (ex: Siège bébé + Rehausseur)');
      console.log('   4. Assignez la course à un chauffeur');
      console.log('   5. Ouvrez l\'app chauffeur et vous verrez tout s\'afficher!\n');
    } else {
      console.log('\n❌ Certaines colonnes sont manquantes!');
      console.log('\n🔧 SOLUTION:');
      console.log('   Les colonnes manquantes doivent être ajoutées par un administrateur Supabase.');
      console.log('   La clé ANON ne permet pas de modifier la structure de la base.\n');
      console.log('   📝 Copiez ce message et donnez-le à votre administrateur:\n');
      console.log('   ═══════════════════════════════════════════════════════════════');
      console.log('   Exécutez cette requête SQL dans Supabase SQL Editor:');
      console.log('   ═══════════════════════════════════════════════════════════════\n');
      console.log(`   ALTER TABLE public.courses
     ADD COLUMN IF NOT EXISTS flight_number text,
     ADD COLUMN IF NOT EXISTS extras text,
     ADD COLUMN IF NOT EXISTS dispatch_mode text,
     ADD COLUMN IF NOT EXISTS company_name text;

   COMMENT ON COLUMN public.courses.extras IS
     'Équipements spéciaux demandés: siège bébé, rehausseur, cosy, etc.';
      `);
      console.log('   ═══════════════════════════════════════════════════════════════\n');
    }

    // Vérifier s'il y a des courses avec notes contenant des mots-clés d'extras
    const { data: coursesWithKeywords, error: keywordError } = await supabase
      .from('courses')
      .select('id, client_name, notes, extras')
      .or('notes.ilike.%siège%,notes.ilike.%rehausseur%,notes.ilike.%cosy%,notes.ilike.%bébé%,notes.ilike.%baby%')
      .limit(10);

    if (!keywordError && coursesWithKeywords && coursesWithKeywords.length > 0) {
      console.log('\n🔍 Courses avec mots-clés d\'extras dans les notes:');
      console.log('   (Ces courses devraient afficher les extras même sans le champ dédié)\n');
      coursesWithKeywords.forEach((c, i) => {
        console.log(`   ${i + 1}. ${c.client_name}`);
        console.log(`      Notes: ${c.notes}`);
        console.log(`      Extras: ${c.extras || '(vide)'}\n`);
      });
    }

  } catch (err) {
    console.error('❌ Erreur:', err.message);
  }
}

checkColumns();
