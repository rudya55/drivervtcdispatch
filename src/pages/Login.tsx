import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Car, Loader2, Eye, EyeOff } from 'lucide-react';
import { supabase, SUPABASE_URL, SUPABASE_ANON_KEY } from '@/lib/supabase';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  email: z.string().trim().email({ message: "Email invalide" }),
  password: z.string().min(6, { message: "Le mot de passe doit contenir au moins 6 caractères" })
});

const signupSchema = z.object({
  name: z.string().trim().min(2, { message: "Le nom doit contenir au moins 2 caractères" }).max(100),
  phone: z.string().trim().min(10, { message: "Numéro de téléphone invalide" }).max(20),
  email: z.string().trim().email({ message: "Email invalide" }).max(255),
  password: z.string().min(8, { message: "Le mot de passe doit contenir au moins 8 caractères" }).max(100),
  confirmPassword: z.string()
}).refine((data) => data.password === data.confirmPassword, {
  message: "Les mots de passe ne correspondent pas",
  path: ["confirmPassword"]
});

const resetSchema = z.object({
  email: z.string().trim().email({ message: "Email invalide" })
});

type ViewType = 'login' | 'signup' | 'reset';

const Login = () => {
  const [view, setView] = useState<ViewType>('login');
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  
  // Signup state
  const [signupName, setSignupName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupConfirmPassword, setSignupConfirmPassword] = useState('');
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showSignupConfirmPassword, setShowSignupConfirmPassword] = useState(false);
  
  // Reset password state
  const [resetEmail, setResetEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      loginSchema.parse({ email: loginEmail, password: loginPassword });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    try {
      await login(loginEmail, loginPassword);
      toast.success('Connexion réussie');
      navigate('/');
    } catch (error: any) {
      console.error('Login error:', error);
      
      let errorMessage = 'Erreur de connexion';
      
      if (error.message) {
        if (error.message.includes("n'est pas un compte chauffeur")) {
          errorMessage = "Ce compte n'est pas un compte chauffeur. Veuillez utiliser l'application admin.";
        } else if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou mot de passe incorrect';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Veuillez confirmer votre email';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      signupSchema.parse({
        name: signupName,
        phone: signupPhone,
        email: signupEmail,
        password: signupPassword,
        confirmPassword: signupConfirmPassword
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    try {
      // Sign up with Supabase Auth
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: signupEmail,
        password: signupPassword,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            name: signupName,
            phone: signupPhone
          }
        }
      });

      if (signUpError) {
        throw signUpError;
      }

      if (!signUpData.user) {
        throw new Error('Erreur lors de la création du compte');
      }

      // Check if email confirmation is required
      const emailConfirmationRequired = !signUpData.session;

      if (emailConfirmationRequired) {
        // Email confirmation is enabled in Supabase
        toast.success(
          'Compte créé avec succès ! Veuillez vérifier votre email pour confirmer votre compte avant de vous connecter.',
          { duration: 6000 }
        );
        setView('login');
        
        // Pre-fill login email
        setLoginEmail(signupEmail);
      } else {
        // No email confirmation required, auto-login
        const { error: loginError } = await supabase.auth.signInWithPassword({
          email: signupEmail,
          password: signupPassword
        });

        if (loginError) {
          toast.success('Compte créé avec succès ! Connectez-vous pour continuer.');
          setView('login');
          setLoginEmail(signupEmail);
        } else {
          toast.success('Compte créé et connecté avec succès !');
          navigate('/');
        }
      }
      
      // Reset form
      setSignupName('');
      setSignupPhone('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');

    } catch (error: any) {
      let errorMessage = 'Erreur lors de la création du compte';
      
      if (error.message) {
        if (error.message.includes('User already registered')) {
          errorMessage = 'Cet email est déjà utilisé. Essayez de vous connecter.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Email invalide';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'Le mot de passe doit contenir au moins 6 caractères';
        } else {
          errorMessage = error.message;
        }
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      resetSchema.parse({ email: resetEmail });
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast.error(error.errors[0].message);
        return;
      }
    }

    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/reset-password`
      });

      if (error) throw error;

      toast.success('Email de réinitialisation envoyé ! Vérifiez votre boîte mail.');
      setResetEmail('');
    } catch (error: any) {
      console.error('Reset password error:', error);
      toast.error(error.message || 'Erreur lors de l\'envoi de l\'email');
    } finally {
      setLoading(false);
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'signup': return 'Créer un compte';
      case 'reset': return 'Réinitialiser le mot de passe';
      default: return 'Connexion';
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="flex flex-col items-center space-y-2">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            <Car className="w-8 h-8 text-primary-foreground" />
          </div>
          <h1 className="text-2xl font-bold text-center">VTC Driver</h1>
          <p className="text-sm text-muted-foreground text-center">
            Gérez vos courses en temps réel
          </p>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-center">{getTitle()}</h2>

          {/* Login View */}
          {view === 'login' && (
            <div className="space-y-4 animate-fade-in">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Mot de passe</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showLoginPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="current-password"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowLoginPassword(!showLoginPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showLoginPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Se connecter
                </Button>
              </form>

              <div className="space-y-2 text-center text-sm">
                <button
                  type="button"
                  onClick={() => setView('reset')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  Mot de passe oublié ?
                </button>
                <div className="text-muted-foreground">
                  Pas encore de compte ?{' '}
                  <button
                    type="button"
                    onClick={() => setView('signup')}
                    className="font-semibold text-primary hover:underline"
                  >
                    S'inscrire
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Signup View */}
          {view === 'signup' && (
            <div className="space-y-4 animate-fade-in">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nom complet *</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Jean Dupont"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Téléphone *</Label>
                  <Input
                    id="signup-phone"
                    type="tel"
                    placeholder="+33612345678"
                    value={signupPhone}
                    onChange={(e) => setSignupPhone(e.target.value)}
                    disabled={loading}
                    maxLength={20}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email *</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                    maxLength={255}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      type={showSignupPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupPassword(!showSignupPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showSignupPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Au moins 8 caractères
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirmer le mot de passe *</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm"
                      type={showSignupConfirmPassword ? "text" : "password"}
                      placeholder="••••••••"
                      className="pr-10"
                      value={signupConfirmPassword}
                      onChange={(e) => setSignupConfirmPassword(e.target.value)}
                      disabled={loading}
                      autoComplete="new-password"
                      maxLength={100}
                    />
                    <button
                      type="button"
                      onClick={() => setShowSignupConfirmPassword(!showSignupConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showSignupConfirmPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Créer mon compte
                </Button>
              </form>

              <div className="text-center text-sm text-muted-foreground">
                Déjà un compte ?{' '}
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="font-semibold text-primary hover:underline"
                >
                  Se connecter
                </button>
              </div>
            </div>
          )}

          {/* Reset Password View */}
          {view === 'reset' && (
            <div className="space-y-4 animate-fade-in">
              <p className="text-sm text-muted-foreground text-center">
                Entrez votre email pour recevoir un lien de réinitialisation de mot de passe.
              </p>
              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="reset-email">Email</Label>
                  <Input
                    id="reset-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    disabled={loading}
                    autoComplete="email"
                  />
                </div>

                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Envoyer le lien
                </Button>
              </form>

              <div className="text-center text-sm">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-muted-foreground hover:text-foreground transition-colors"
                >
                  ← Retour à la connexion
                </button>
              </div>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
};

export default Login;
