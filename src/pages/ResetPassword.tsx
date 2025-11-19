import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Car, Loader2 } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { z } from 'zod';

const passwordSchema = z.object({
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }).max(100),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    console.log('🔐 ResetPassword page loaded - APP CHAUFFEUR');
    console.log('🌐 Current URL:', window.location.href);
    
    let hasReceivedEvent = false;

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('🔔 Auth event:', event);
      console.log('👤 Session user:', session?.user?.id);
      console.log('🎭 User role:', session?.user?.user_metadata?.role);
      
      hasReceivedEvent = true;

      if (event === 'PASSWORD_RECOVERY') {
        // Valid recovery token, user can change password
        console.log('✅ Token de récupération valide');
        
        // Vérifier immédiatement le rôle
        const userRole = session?.user?.user_metadata?.role;
        if (userRole && userRole !== 'driver') {
          console.error('❌ Rôle incorrect détecté:', userRole);
          supabase.auth.signOut();
          toast.error("Ce compte n'est pas un compte chauffeur. Veuillez utiliser l'application appropriée.");
          navigate('/login');
          return;
        }
        
        setValidToken(true);
      } else if (event === 'SIGNED_OUT') {
        console.warn('⚠️ Utilisateur déconnecté');
        setValidToken(false);
        toast.error('Session expirée');
        navigate('/login');
      }
    });

    // Wait a moment for the PASSWORD_RECOVERY event before checking session
    const timeoutId = setTimeout(() => {
      if (!hasReceivedEvent) {
        supabase.auth.getSession().then(({ data: { session } }) => {
          console.log('🔍 Session check après timeout:', session?.user?.id);
          
          if (!session) {
            console.warn('⚠️ Aucune session trouvée après timeout');
            setValidToken(false);
            toast.error('Lien invalide ou expiré');
            navigate('/login');
          }
        });
      }
    }, 1500);

    // Cleanup subscription on unmount
    return () => {
      clearTimeout(timeoutId);
      subscription.unsubscribe();
    };
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      passwordSchema.parse({ password, confirmPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    try {
      console.log('🔄 Début de la mise à jour du mot de passe');
      
      // Vérifier le rôle avant de changer le mot de passe
      const { data: { session } } = await supabase.auth.getSession();
      
      console.log('🔍 Vérification session:', session?.user?.id);
      console.log('🎭 Vérification rôle:', session?.user?.user_metadata?.role);
      
      if (session?.user) {
        const userRole = session.user.user_metadata?.role;
        
        if (userRole && userRole !== 'driver') {
          console.error('❌ Rôle non-chauffeur détecté lors de la mise à jour:', userRole);
          await supabase.auth.signOut();
          toast.error("Ce compte n'est pas un compte chauffeur. Veuillez utiliser l'application appropriée.");
          navigate('/login');
          return;
        }
      }
      
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        console.error('❌ Erreur lors de la mise à jour:', error);
        throw error;
      }

      console.log('✅ Mot de passe modifié avec succès');
      toast.success('Mot de passe modifié avec succès !');
      navigate('/login');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Erreur lors de la modification du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-center">Nouveau mot de passe</h1>
          <p className="text-sm text-muted-foreground text-center">
            Entrez votre nouveau mot de passe
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nouveau mot de passe</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              maxLength={100}
            />
            <p className="text-xs text-muted-foreground">
              Au moins 8 caractères
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirm">Confirmer le mot de passe</Label>
            <Input
              id="confirm"
              type="password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              autoComplete="new-password"
              maxLength={100}
            />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Changer le mot de passe
          </Button>
        </form>
      </Card>
    </div>
  );
};

export default ResetPassword;
