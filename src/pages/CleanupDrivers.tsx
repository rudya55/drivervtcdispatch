import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2 } from 'lucide-react';

export default function CleanupDrivers() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const { toast } = useToast();

  const handleCleanup = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('cleanup-driver-accounts');

      if (error) {
        throw error;
      }

      setResult(data);
      toast({
        title: "Nettoyage terminé",
        description: `${data.deletedEmails?.length || 0} compte(s) incomplet(s) supprimé(s)`,
      });
    } catch (error: any) {
      console.error('Cleanup error:', error);
      toast({
        variant: "destructive",
        title: "Erreur de nettoyage",
        description: error.message || "Une erreur est survenue",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Nettoyage des chauffeurs incomplets</CardTitle>
            <CardDescription>
              Supprime tous les comptes chauffeurs qui n'ont pas de profil driver associé
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              onClick={handleCleanup}
              disabled={loading}
              className="w-full"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Nettoyage en cours...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Nettoyer les comptes incomplets
                </>
              )}
            </Button>

            {result && (
              <div className="mt-4 p-4 bg-muted rounded-lg">
                <p className="font-semibold mb-2">Résultat du nettoyage:</p>
                <p className="text-sm">Comptes supprimés: {result.deletedEmails?.length || 0}</p>
                {result.deletedEmails && result.deletedEmails.length > 0 && (
                  <div className="mt-2">
                    <p className="text-sm font-medium">Emails supprimés:</p>
                    <ul className="text-sm text-muted-foreground list-disc list-inside">
                      {result.deletedEmails.map((email: string, index: number) => (
                        <li key={index}>{email}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
