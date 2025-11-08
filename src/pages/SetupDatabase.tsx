import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import { Loader2, Database, CheckCircle } from 'lucide-react';

const SetupDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [completed, setCompleted] = useState(false);

  const handleSetup = async () => {
    setLoading(true);
    
    try {
      console.log('Calling setup-database function...');
      
      const { data, error } = await supabase.functions.invoke('setup-database');

      if (error) {
        console.error('Setup error:', error);
        throw error;
      }

      if (data?.error) {
        console.error('Setup data error:', data.error);
        throw new Error(data.error);
      }

      console.log('Setup response:', data);
      toast.success(data.message || 'Base de données configurée avec succès !');
      setCompleted(true);
    } catch (error: any) {
      console.error('Setup failed:', error);
      toast.error(error.message || 'Erreur lors de la configuration');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md p-6 space-y-6">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-primary flex items-center justify-center">
            {completed ? (
              <CheckCircle className="w-8 h-8 text-primary-foreground" />
            ) : (
              <Database className="w-8 h-8 text-primary-foreground" />
            )}
          </div>
          
          <div className="text-center space-y-2">
            <h1 className="text-2xl font-bold">
              {completed ? 'Configuration terminée !' : 'Configuration de la base de données'}
            </h1>
            <p className="text-sm text-muted-foreground">
              {completed 
                ? 'Votre base de données est prête. Vous pouvez maintenant créer un compte chauffeur.'
                : 'Cliquez sur le bouton ci-dessous pour initialiser la structure de la base de données.'
              }
            </p>
          </div>

          {!completed && (
            <Button 
              onClick={handleSetup} 
              disabled={loading}
              className="w-full"
              size="lg"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {loading ? 'Configuration en cours...' : 'Configurer maintenant'}
            </Button>
          )}

          {completed && (
            <div className="space-y-2 w-full">
              <Button 
                onClick={() => window.location.href = '/login'}
                className="w-full"
                size="lg"
              >
                Aller à la connexion
              </Button>
              <Button 
                onClick={() => setCompleted(false)}
                variant="outline"
                className="w-full"
                size="sm"
              >
                Réinitialiser (si besoin)
              </Button>
            </div>
          )}
        </div>

        <div className="text-xs text-muted-foreground text-center space-y-1">
          <p>Cette opération va créer :</p>
          <ul className="list-disc list-inside text-left">
            <li>Table user_roles (rôles utilisateurs)</li>
            <li>Type app_role (enum driver/fleet_manager)</li>
            <li>Politiques RLS de sécurité</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};

export default SetupDatabase;
