/**
 * Script to check and apply database migrations
 * This script checks if the 'approved' column exists and provides instructions
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SUPABASE_URL = 'https://qroqygbculbfqkbinqmp.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFyb3F5Z2JjdWxiZnFrYmlucW1wIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk5NDUzNzYsImV4cCI6MjA3NTUyMTM3Nn0.C7fui8NfcJhY77ZTjtbxkCWsUimWFdD4MWEoIkXU7Zg';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkMigrations() {
  console.log('🔍 Vérification de l\'état des migrations...\n');

  try {
    // Try to query drivers table with approved column
    const { data, error } = await supabase
      .from('drivers')
      .select('id, approved')
      .limit(1);

    if (error) {
      if (error.message.includes('approved') || error.code === '42703') {
        console.log('❌ La colonne "approved" n\'existe PAS dans la table drivers');
        console.log('\n📋 MIGRATIONS À APPLIQUER:\n');
        printMigrationInstructions();
        return false;
      }
      console.error('Erreur lors de la vérification:', error.message);
      return false;
    }

    console.log('✅ La colonne "approved" existe déjà!');
    console.log('✅ Les migrations semblent déjà être appliquées.\n');

    if (data && data.length > 0) {
      console.log(`📊 Exemple de données: approved = ${data[0].approved}`);
    }

    return true;
  } catch (err) {
    console.error('Erreur:', err.message);
    return false;
  }
}

function printMigrationInstructions() {
  console.log(`
╔════════════════════════════════════════════════════════════════╗
║  INSTRUCTIONS POUR APPLIQUER LES MIGRATIONS                    ║
╚════════════════════════════════════════════════════════════════╝

Les migrations doivent être appliquées via le Dashboard Supabase.

📍 URL de votre projet Supabase:
   https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp

🔧 MÉTHODE 1: Via le Dashboard Supabase (RECOMMANDÉ)

   1. Connectez-vous à: https://supabase.com/dashboard/project/qroqygbculbfqkbinqmp

   2. Allez dans "SQL Editor" (icône de base de données)

   3. Cliquez sur "+ New query"

   4. EXÉCUTEZ LES MIGRATIONS DANS CET ORDRE:

      ┌─────────────────────────────────────────────────────┐
      │ MIGRATION 1: Ajouter la colonne approved            │
      └─────────────────────────────────────────────────────┘

      Ouvrez: supabase/migrations/20250116000000_add_driver_approval_system.sql
      Copiez tout le contenu et exécutez-le dans SQL Editor

      ┌─────────────────────────────────────────────────────┐
      │ MIGRATION 2: Créer le trigger automatique           │
      └─────────────────────────────────────────────────────┘

      Ouvrez: supabase/migrations/20250116000001_auto_create_driver_profile.sql
      Copiez tout le contenu et exécutez-le dans SQL Editor

🔧 MÉTHODE 2: Via Lovable (Automatique)

   Les migrations dans le dossier supabase/migrations/ sont automatiquement
   appliquées lors du prochain déploiement Lovable.

   Après avoir poussé le code, Lovable détectera et appliquera les migrations.

⚠️  OPTIONNEL: Nettoyer les comptes existants

   Si vous voulez supprimer TOUS les comptes chauffeurs (IRRÉVERSIBLE):

   Exécutez: supabase/migrations/CLEANUP_drivers.sql
   dans le SQL Editor

✅ VÉRIFICATION

   Après avoir exécuté les migrations, relancez ce script pour vérifier:

   npm run check-migrations

══════════════════════════════════════════════════════════════════
`);
}

async function printMigrationSQL() {
  console.log('\n📄 CONTENU DES MIGRATIONS À COPIER-COLLER:\n');
  console.log('═══════════════════════════════════════════════════════════════════');
  console.log('MIGRATION 1: 20250116000000_add_driver_approval_system.sql');
  console.log('═══════════════════════════════════════════════════════════════════\n');

  try {
    const migration1 = readFileSync(
      join(__dirname, '../supabase/migrations/20250116000000_add_driver_approval_system.sql'),
      'utf-8'
    );
    console.log(migration1);

    console.log('\n═══════════════════════════════════════════════════════════════════');
    console.log('MIGRATION 2: 20250116000001_auto_create_driver_profile.sql');
    console.log('═══════════════════════════════════════════════════════════════════\n');

    const migration2 = readFileSync(
      join(__dirname, '../supabase/migrations/20250116000001_auto_create_driver_profile.sql'),
      'utf-8'
    );
    console.log(migration2);

  } catch (err) {
    console.error('Erreur lors de la lecture des fichiers de migration:', err.message);
  }
}

// Main execution
(async () => {
  const isApplied = await checkMigrations();

  if (!isApplied) {
    const args = process.argv.slice(2);
    if (args.includes('--show-sql')) {
      await printMigrationSQL();
    }
  }
})();
