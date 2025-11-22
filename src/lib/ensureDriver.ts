import { supabase } from '@/lib/supabase';

/**
 * Ensures a driver profile exists for the current user.
 * If no profile exists, creates one with minimal data.
 * Returns both the driver ID and user ID (auth.uid).
 */
export async function ensureDriverExists(): Promise<{ driverId: string; userId: string }> {
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (sessionError || !session) {
    throw new Error('Session expirée - veuillez vous reconnecter');
  }

  const userId = session.user.id; // Store user_id for storage operations

  // Check if driver profile already exists
  const { data: existing, error: selectError } = await supabase
    .from('drivers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (selectError) {
    console.error('Error checking existing driver:', selectError);
    throw new Error('Erreur lors de la vérification du profil');
  }

  // If profile exists, return both IDs
  if (existing?.id) {
    console.log('✅ Driver profile exists:', existing.id);
    return { driverId: existing.id, userId };
  }

  // Create minimal driver profile
  console.log('🆕 Creating new driver profile for user:', userId);
  const { data: newDriver, error: insertError } = await supabase
    .from('drivers')
    .insert({
      user_id: userId,
      status: 'inactive',
      name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Chauffeur',
      email: session.user.email || '',
      phone: session.user.user_metadata?.phone || '',
      type: 'vtc',
    })
    .select('id')
    .single();

  if (insertError) {
    console.error('Error creating driver profile:', insertError);
    throw new Error('Erreur lors de la création du profil');
  }

  console.log('✅ Driver profile created:', newDriver.id);
  return { driverId: newDriver.id, userId };
}
