import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { Car, Loader2, Eye, EyeOff, Fingerprint } from 'lucide-react';
import { supabase } from '@/lib/supabase';
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
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);
  const [pendingCredentials, setPendingCredentials] = useState<{ email: string; password: string } | null>(null);
  
  const { login } = useAuth();
  const navigate = useNavigate();
  const { 
    isAvailable: biometricAvailable, 
    isNative,
    biometryType, 
    hasCredentials,
    saveCredentials,
    authenticateAndGetCredentials,
    checkCredentials
  } = useBiometricAuth();

  // Check for stored credentials on mount
  useEffect(() => {
    if (isNative) {
      checkCredentials();
    }
  }, [isNative, checkCredentials]);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      const credentials = await authenticateAndGetCredentials();
      
      if (!credentials) {
        toast.error('Authentification biométrique annulée');
        return;
      }

      await login(credentials.username, credentials.password);
      toast.success('Connexion réussie');
      navigate('/');
    } catch (error: any) {
      console.error('Biometric login error:', error);
      
      if (error.message === 'PENDING_APPROVAL') {
        toast.info('Compte en attente de validation');
      } else {
        toast.error('Erreur de connexion biométrique', {
          description: 'Utilisez vos identifiants pour vous connecter'
        });
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  const handleSaveBiometric = async (save: boolean) => {
    if (save && pendingCredentials) {
      const saved = await saveCredentials(pendingCredentials.email, pendingCredentials.password);
      if (saved) {
        toast.success(`${biometryType} activé pour la connexion`);
      }
    }
    setShowBiometricPrompt(false);
    setPendingCredentials(null);
    navigate('/');
  };

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
      console.debug('Client-side login with Supabase Auth');
      
      const normalizedEmail = loginEmail.trim().toLowerCase();
      
      await login(normalizedEmail, loginPassword);
      toast.success('Connexion réussie');
      
      // If biometric is available and no credentials saved, propose to save
      if (biometricAvailable && !hasCredentials) {
        setPendingCredentials({ email: normalizedEmail, password: loginPassword });
        setShowBiometricPrompt(true);
      } else {
        navigate('/');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      if (error.message === 'PENDING_APPROVAL') {
        toast.info('Compte en attente de validation', {
          description: "Votre inscription a été reçue. Un administrateur doit approuver votre compte.",
          duration: 8000
        });
      } else if (error.message === 'PROFILE_CREATED_PENDING') {
        toast.info('Profil créé - En attente d\'approbation', {
          description: "Votre profil chauffeur a été créé automatiquement.",
          duration: 8000
        });
      } else if (error.message?.includes('Invalid login credentials') || error.message?.includes('invalid_credentials')) {
        toast.error('Email ou mot de passe incorrect');
      } else if (error.message?.includes('Email not confirmed')) {
        toast.error('Veuillez confirmer votre email');
      } else {
        toast.error('Erreur de connexion', { description: error.message });
      }
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
      const normalizedEmail = signupEmail.trim().toLowerCase();
      
      const { data, error } = await supabase.functions.invoke('create-user-account', {
        body: {
          email: normalizedEmail,
          password: signupPassword,
          role: 'driver',
          name: signupName,
          phone: signupPhone
        }
      });

      if (error) {
        toast.error('Erreur lors de la création du compte: ' + error.message);
        return;
      }

      if (data?.error) {
        if (data.error.includes('déjà enregistré') || data.error.includes('already registered')) {
          toast.error('Cet email est déjà enregistré');
        } else {
          toast.error('Erreur: ' + data.error);
        }
        return;
      }

      if (data?.success) {
        toast.success('Compte créé avec succès !', {
          description: 'Votre compte est en attente de validation.',
          duration: 8000
        });
        setView('login');
        setLoginEmail(normalizedEmail);
      }
      
      setSignupName('');
      setSignupPhone('');
      setSignupEmail('');
      setSignupPassword('');
      setSignupConfirmPassword('');

    } catch (error: any) {
      console.error('Signup error:', error);
      toast.error('Erreur lors de la création du compte');
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

      toast.success('Email de réinitialisation envoyé !');
      setResetEmail('');
    } catch (error: any) {
      toast.error(error.message || 'Erreur lors de l\'envoi');
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

  // Biometric save prompt modal
  if (showBiometricPrompt) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md p-6 space-y-6">
          <div className="flex flex-col items-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
              <Fingerprint className="w-10 h-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold text-center">Activer {biometryType} ?</h2>
            <p className="text-sm text-muted-foreground text-center">
              Connectez-vous plus rapidement avec {biometryType} la prochaine fois.
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              className="w-full" 
              onClick={() => handleSaveBiometric(true)}
            >
              Activer {biometryType}
            </Button>
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={() => handleSaveBiometric(false)}
            >
              Plus tard
            </Button>
          </div>
        </Card>
      </div>
    );
  }

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
              {/* Biometric Login Button */}
              {biometricAvailable && hasCredentials && (
                <Button
                  type="button"
                  variant="outline"
                  className="w-full h-14 border-2 border-primary/30 hover:border-primary hover:bg-primary/5"
                  onClick={handleBiometricLogin}
                  disabled={biometricLoading}
                >
                  {biometricLoading ? (
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  ) : (
                    <Fingerprint className="w-5 h-5 mr-2 text-primary" />
                  )}
                  Se connecter avec {biometryType}
                </Button>
              )}

              {biometricAvailable && hasCredentials && (
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">ou</span>
                  </div>
                </div>
              )}

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
                      {showLoginPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                      {showSignupPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <p className="text-xs text-muted-foreground">Au moins 8 caractères</p>
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
                      {showSignupConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
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
                Entrez votre email pour recevoir un lien de réinitialisation.
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

              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setView('login')}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Retour à la connexion
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
