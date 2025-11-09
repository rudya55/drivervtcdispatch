import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Loader2, Rocket, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

const InitDemo = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const initializeDemo = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('initialize-driver-demo');
      
      if (error) throw error;
      
      toast.success(data.message || 'Configuration terminée !');
      setDone(true);
      
      setTimeout(() => {
        navigate('/bookings');
      }, 2000);
    } catch (error: any) {
      console.error('Init error:', error);
      toast.error(error.message || 'Erreur lors de l\'initialisation');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="max-w-md w-full p-8 text-center space-y-6">
        {!done ? (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center">
                <Rocket className="w-10 h-10 text-primary" />
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold mb-2">Initialisation</h1>
              <p className="text-muted-foreground">
                Créer votre profil et générer des courses de test
              </p>
            </div>

            <Button 
              onClick={initializeDemo} 
              disabled={loading}
              size="lg"
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Initialisation en cours...
                </>
              ) : (
                <>
                  <Rocket className="w-5 h-5 mr-2" />
                  Démarrer
                </>
              )}
            </Button>
          </>
        ) : (
          <>
            <div className="flex justify-center">
              <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
                <CheckCircle className="w-10 h-10 text-success" />
              </div>
            </div>
            
            <div>
              <h1 className="text-2xl font-bold mb-2">C'est prêt !</h1>
              <p className="text-muted-foreground">
                Redirection vers vos courses...
              </p>
            </div>
          </>
        )}
      </Card>
    </div>
  );
};

export default InitDemo;
