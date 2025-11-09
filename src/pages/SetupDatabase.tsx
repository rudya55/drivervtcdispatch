import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, AlertCircle, ExternalLink, Database, Map } from 'lucide-react';

const SetupDatabase = () => {
  const navigate = useNavigate();
  const [copiedDomain, setCopiedDomain] = useState(false);

  const currentDomain = window.location.origin;

  const copyDomain = () => {
    navigator.clipboard.writeText(`${currentDomain}/*`);
    setCopiedDomain(true);
    setTimeout(() => setCopiedDomain(false), 2000);
  };

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-3xl mx-auto pt-8 space-y-6">
        <Button 
          variant="ghost" 
          onClick={() => navigate('/')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour à l'accueil
        </Button>
        
        <h1 className="text-3xl font-bold">Configuration requise</h1>
        
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Deux configurations sont nécessaires pour que l'application fonctionne correctement.
          </AlertDescription>
        </Alert>

        {/* Google Maps Section */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Map className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">1. Configuration Google Maps</h2>
                <p className="text-sm text-muted-foreground">
                  L'erreur <code className="bg-muted px-1 rounded">RefererNotAllowedMapError</code> indique que votre domaine n'est pas autorisé.
                </p>
              </div>

              <div className="space-y-3">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Domaine à autoriser :</p>
                  <div className="flex gap-2">
                    <code className="flex-1 bg-background px-3 py-2 rounded text-sm">
                      {currentDomain}/*
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={copyDomain}
                    >
                      {copiedDomain ? 'Copié !' : 'Copier'}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Étapes :</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Allez sur la <a 
                      href="https://console.cloud.google.com/google/maps-apis/credentials" 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="text-primary hover:underline inline-flex items-center gap-1"
                    >
                      Console Google Cloud
                      <ExternalLink className="w-3 h-3" />
                    </a></li>
                    <li>Sélectionnez votre projet Google Cloud</li>
                    <li>Cliquez sur votre clé API Google Maps</li>
                    <li>Dans "Restrictions d'application", choisissez "Références HTTP"</li>
                    <li>Ajoutez le domaine copié ci-dessus</li>
                    <li>Cliquez sur "Enregistrer"</li>
                    <li>Attendez quelques minutes (propagation des changements)</li>
                    <li>Rafraîchissez votre page d'accueil</li>
                  </ol>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Database Section */}
        <Card className="p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Database className="w-6 h-6 text-primary" />
            </div>
            <div className="flex-1 space-y-4">
              <div>
                <h2 className="text-xl font-semibold mb-2">2. Configuration de la base de données</h2>
                <p className="text-sm text-muted-foreground">
                  La colonne <code className="bg-muted px-1 rounded">type</code> de la table <code className="bg-muted px-1 rounded">drivers</code> cause des erreurs et doit être supprimée.
                </p>
              </div>

              <div className="space-y-3">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Cette opération ne peut être effectuée que manuellement depuis l'interface Cloud de Lovable.
                  </AlertDescription>
                </Alert>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Étapes :</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
                    <li>Cliquez sur l'onglet <strong>Cloud</strong> en haut de la page Lovable</li>
                    <li>Dans le menu de gauche, cliquez sur <strong>Database</strong></li>
                    <li>Sélectionnez la table <strong>drivers</strong></li>
                    <li>Trouvez la colonne <strong>type</strong></li>
                    <li>Cliquez sur les trois points à côté de la colonne</li>
                    <li>Sélectionnez <strong>Delete column</strong></li>
                    <li>Confirmez la suppression</li>
                    <li>Revenez à l'application et essayez à nouveau</li>
                  </ol>
                </div>

                <div className="bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900 p-4 rounded-lg">
                  <p className="text-sm text-orange-800 dark:text-orange-200">
                    <strong>Alternative :</strong> Si vous ne pouvez pas supprimer la colonne, vous pouvez la rendre nullable (autoriser les valeurs NULL) depuis les paramètres de la colonne.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-muted">
          <div className="space-y-2">
            <h3 className="font-semibold flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Après avoir effectué ces configurations
            </h3>
            <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground ml-7">
              <li>Rafraîchissez la page d'accueil (F5)</li>
              <li>Cliquez sur le bouton "Hors ligne"</li>
              <li>La carte Google Maps devrait maintenant s'afficher</li>
              <li>Le bouton devrait fonctionner sans erreur</li>
            </ul>
          </div>
        </Card>

        <div className="flex justify-center pb-8">
          <Button
            size="lg"
            onClick={() => navigate('/')}
          >
            Retour à l'accueil
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SetupDatabase;
