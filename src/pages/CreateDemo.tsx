import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

export default function CreateDemo() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    credentials?: {
      email: string;
      password: string;
    };
    driver_id?: string;
    courses_created?: number;
  } | null>(null);

  const createDemoAccount = async () => {
    setLoading(true);
    setResult(null);

    try {
      const { data, error } = await supabase.functions.invoke('create-demo-account');

      if (error) {
        throw error;
      }

      setResult({
        success: true,
        message: data.message || 'Compte créé avec succès',
        credentials: data.credentials,
        driver_id: data.driver_id,
        courses_created: data.courses_created,
      });
    } catch (error: any) {
      setResult({
        success: false,
        message: error.message || 'Une erreur est survenue',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="text-2xl">🚗 Compte de démonstration</CardTitle>
          <CardDescription>
            Créez un compte de test avec des courses de démonstration pour tester l'application
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={createDemoAccount}
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Création en cours...
              </>
            ) : (
              'Créer le compte de démonstration'
            )}
          </Button>

          {result && (
            <Alert variant={result.success ? 'default' : 'destructive'}>
              <div className="flex items-start gap-3">
                {result.success ? (
                  <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                )}
                <div className="flex-1 space-y-3">
                  <AlertDescription className="font-semibold">
                    {result.message}
                  </AlertDescription>

                  {result.success && result.credentials && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 space-y-2">
                      <p className="font-semibold text-sm text-yellow-900">
                        📧 Identifiants de connexion :
                      </p>
                      <div className="space-y-1 text-sm">
                        <p>
                          <strong>Email :</strong>{' '}
                          <code className="bg-yellow-100 px-2 py-1 rounded">
                            {result.credentials.email}
                          </code>
                        </p>
                        <p>
                          <strong>Mot de passe :</strong>{' '}
                          <code className="bg-yellow-100 px-2 py-1 rounded">
                            {result.credentials.password}
                          </code>
                        </p>
                      </div>
                    </div>
                  )}

                  {result.success && (
                    <div className="text-sm space-y-1 text-gray-700">
                      {result.driver_id && (
                        <p>
                          <strong>Driver ID :</strong> {result.driver_id}
                        </p>
                      )}
                      {result.courses_created !== undefined && (
                        <p>
                          <strong>Courses créées :</strong> {result.courses_created}
                        </p>
                      )}
                      <p className="mt-3 font-semibold text-green-700">
                        🎯 Vous pouvez maintenant vous connecter avec ces identifiants !
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </Alert>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
            <p className="font-semibold mb-2">ℹ️ À propos du compte de démonstration</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>Chauffeur : Jean Démo</li>
              <li>Véhicule : Mercedes Classe E (AB-123-CD)</li>
              <li>2 courses de démonstration pré-créées</li>
              <li>Notifications activées pour chaque course</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
