import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useNotifications } from '@/hooks/useNotifications';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { Header } from '@/components/Header';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, Eye, EyeOff, Fingerprint, Shield, Smartphone } from 'lucide-react';

const Security = () => {
  const { driver } = useAuth();
  const { unreadCount } = useNotifications(driver?.id || null);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [showPassword, setShowPassword] = useState({
    current: false,
    new: false,
    confirm: false,
  });
  const [formData, setFormData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const {
    isAvailable: biometricAvailable,
    isNative,
    biometryType,
    hasCredentials,
    saveCredentials,
    deleteCredentials,
    authenticate,
  } = useBiometricAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (formData.newPassword !== formData.confirmPassword) {
      toast.error('Les mots de passe ne correspondent pas');
      return;
    }

    if (formData.newPassword.length < 6) {
      toast.error('Le mot de passe doit contenir au moins 6 caractères');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: formData.newPassword
      });

      if (error) throw error;

      toast.success('Mot de passe modifié avec succès');
      setFormData({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (error: any) {
      console.error('Update password error:', error);
      toast.error('Erreur lors de la modification du mot de passe');
    } finally {
      setLoading(false);
    }
  };

  const handleBiometricToggle = async (enabled: boolean) => {
    setBiometricLoading(true);
    
    try {
      if (enabled) {
        // Need to get current password to save credentials
        const password = prompt('Entrez votre mot de passe actuel pour activer ' + biometryType);
        if (!password) {
          toast.info('Activation annulée');
          setBiometricLoading(false);
          return;
        }

        // Verify identity first
        const verified = await authenticate({
          reason: `Activer ${biometryType}`,
          title: 'Confirmation requise',
          description: `Confirmez votre identité pour activer ${biometryType}`,
        });

        if (!verified) {
          toast.error('Vérification biométrique échouée');
          setBiometricLoading(false);
          return;
        }

        // Get user email from session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user?.email) {
          toast.error('Impossible de récupérer votre email');
          setBiometricLoading(false);
          return;
        }

        // Save credentials
        const saved = await saveCredentials(session.user.email, password);
        if (saved) {
          toast.success(`${biometryType} activé avec succès`);
        } else {
          toast.error('Erreur lors de l\'activation');
        }
      } else {
        // Delete credentials
        const deleted = await deleteCredentials();
        if (deleted) {
          toast.success(`${biometryType} désactivé`);
        } else {
          toast.error('Erreur lors de la désactivation');
        }
      }
    } catch (error) {
      console.error('Biometric toggle error:', error);
      toast.error('Erreur lors de la configuration biométrique');
    } finally {
      setBiometricLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 pt-16">
      <Header title="Sécurité" unreadCount={unreadCount} />

      <div className="max-w-lg mx-auto p-4 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/settings')}
          className="mb-2"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour
        </Button>

        {/* Biometric Authentication Section */}
        {isNative && biometricAvailable && (
          <Card className="p-6 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Fingerprint className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Connexion biométrique</h3>
                <p className="text-sm text-muted-foreground">
                  {biometryType} disponible sur cet appareil
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="flex items-center gap-3">
                <Smartphone className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="font-medium">Activer {biometryType}</p>
                  <p className="text-xs text-muted-foreground">
                    Connexion rapide et sécurisée
                  </p>
                </div>
              </div>
              {biometricLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                <Switch
                  checked={hasCredentials}
                  onCheckedChange={handleBiometricToggle}
                />
              )}
            </div>

            {hasCredentials && (
              <div className="flex items-center gap-2 text-sm text-green-600 bg-green-50 dark:bg-green-950/30 dark:text-green-400 p-3 rounded-lg">
                <Shield className="w-4 h-4" />
                <span>{biometryType} est activé pour votre compte</span>
              </div>
            )}
          </Card>
        )}

        {/* Show message if not on native platform */}
        {!isNative && (
          <Card className="p-6">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Fingerprint className="w-5 h-5" />
              <p className="text-sm">
                L'authentification biométrique est disponible uniquement sur l'application mobile.
              </p>
            </div>
          </Card>
        )}

        {/* Password Change Section */}
        <Card className="p-6">
          <h3 className="font-semibold mb-4">Modifier le mot de passe</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Mot de passe actuel</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  type={showPassword.current ? 'text' : 'password'}
                  value={formData.currentPassword}
                  onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword({ ...showPassword, current: !showPassword.current })}
                >
                  {showPassword.current ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nouveau mot de passe</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  type={showPassword.new ? 'text' : 'password'}
                  value={formData.newPassword}
                  onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword({ ...showPassword, new: !showPassword.new })}
                >
                  {showPassword.new ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmer le mot de passe</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  type={showPassword.confirm ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  required
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="absolute right-0 top-0 h-full"
                  onClick={() => setShowPassword({ ...showPassword, confirm: !showPassword.confirm })}
                >
                  {showPassword.confirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </Button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Modifier le mot de passe
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Security;
