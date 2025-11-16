# Système d'Approbation des Chauffeurs

## Vue d'ensemble

Le système d'approbation des chauffeurs empêche les nouveaux chauffeurs d'accéder à l'application tant qu'un administrateur ou un gestionnaire de flotte ne les a pas approuvés.

## Fonctionnement

### 1. Inscription d'un nouveau chauffeur

Lorsqu'un nouveau chauffeur s'inscrit via l'application mobile :
- Un compte est créé avec `approved: false` par défaut
- Le chauffeur reçoit une confirmation d'inscription
- Le statut est défini sur `inactive`

### 2. Tentative de connexion

Lorsqu'un chauffeur non approuvé tente de se connecter :
- La connexion est automatiquement bloquée
- Un message s'affiche : "Compte en attente de validation"
- Le chauffeur est déconnecté immédiatement

### 3. Approbation par l'administrateur

Les administrateurs peuvent approuver les chauffeurs via l'interface d'administration en utilisant l'Edge Function `admin-approve-driver`.

## Configuration de l'interface d'administration

### Migration SQL

La migration SQL a déjà été créée dans `supabase/migrations/20250116000000_add_driver_approval_system.sql`. Elle ajoute :
- La colonne `approved` (boolean, défaut: false) à la table `drivers`
- Un index pour améliorer les performances

**Important:** Vous devez exécuter cette migration dans votre base de données Supabase.

### Edge Function

L'Edge Function `admin-approve-driver` est déjà créée et configurée. Elle :
- Vérifie que l'utilisateur est un admin ou fleet_manager
- Met à jour le statut `approved` du chauffeur
- Active automatiquement le chauffeur (`status: 'active'`) lors de l'approbation

### Intégration dans le projet admin

Dans votre projet d'administration (`driver-dispatch-admin.lovable.app`), vous devez créer :

#### 1. Page de liste des chauffeurs en attente

```typescript
// src/pages/admin/PendingDrivers.tsx
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

const PendingDrivers = () => {
  const { data: pendingDrivers, refetch } = useQuery({
    queryKey: ['pending-drivers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('drivers')
        .select('*')
        .eq('approved', false)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    }
  });

  const approveDriver = async (driverId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-approve-driver', {
        body: { driver_id: driverId, approved: true }
      });

      if (error) throw error;

      toast.success('Chauffeur approuvé avec succès');
      refetch();
    } catch (error: any) {
      toast.error('Erreur lors de l\'approbation', {
        description: error.message
      });
    }
  };

  const rejectDriver = async (driverId: string) => {
    try {
      const { error } = await supabase.functions.invoke('admin-approve-driver', {
        body: { driver_id: driverId, approved: false }
      });

      if (error) throw error;

      toast.success('Chauffeur rejeté');
      refetch();
    } catch (error: any) {
      toast.error('Erreur lors du rejet', {
        description: error.message
      });
    }
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Chauffeurs en attente d'approbation</h1>
      
      {!pendingDrivers?.length ? (
        <p className="text-muted-foreground">Aucun chauffeur en attente</p>
      ) : (
        <div className="grid gap-4">
          {pendingDrivers.map(driver => (
            <Card key={driver.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{driver.name}</h3>
                  <p className="text-sm text-muted-foreground">{driver.email}</p>
                  <p className="text-sm text-muted-foreground">{driver.phone}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    Inscrit le : {new Date(driver.created_at).toLocaleDateString('fr-FR')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={() => approveDriver(driver.id)}
                    variant="default"
                  >
                    Approuver
                  </Button>
                  <Button 
                    onClick={() => rejectDriver(driver.id)}
                    variant="destructive"
                  >
                    Rejeter
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default PendingDrivers;
```

#### 2. Ajouter la route dans l'admin

```typescript
// Dans votre fichier de routes (ex: App.tsx ou routes.tsx)
<Route path="/admin/pending-drivers" element={<PendingDrivers />} />
```

#### 3. Ajouter un lien dans le menu de navigation

```typescript
<NavLink to="/admin/pending-drivers">
  Chauffeurs en attente
</NavLink>
```

## Workflow complet

1. **Nouveau chauffeur s'inscrit** → `approved: false`, `status: 'inactive'`
2. **Chauffeur tente de se connecter** → Message "En attente de validation"
3. **Admin va sur `/admin/pending-drivers`** → Voit la liste des chauffeurs en attente
4. **Admin clique sur "Approuver"** → `approved: true`, `status: 'active'`
5. **Chauffeur peut maintenant se connecter** → Accès complet à l'application

## Sécurité

- L'Edge Function `admin-approve-driver` vérifie que l'utilisateur a le rôle `admin` ou `fleet_manager` dans la table `user_roles`
- Seuls les utilisateurs authentifiés avec ces rôles peuvent approuver/rejeter des chauffeurs
- Les chauffeurs non approuvés sont automatiquement déconnectés s'ils tentent de se connecter

## Notifications (optionnel)

Pour envoyer un email de confirmation au chauffeur une fois approuvé, vous pouvez ajouter l'intégration Resend dans l'Edge Function `admin-approve-driver` :

```typescript
// Dans admin-approve-driver/index.ts, après l'approbation
if (approved) {
  const resend = new Resend(Deno.env.get('RESEND_API_KEY'));
  
  await resend.emails.send({
    from: 'VTC Dispatch <noreply@votredomaine.com>',
    to: [updatedDriver.email],
    subject: 'Votre compte chauffeur a été approuvé',
    html: `
      <h1>Bienvenue ${updatedDriver.name}!</h1>
      <p>Votre compte chauffeur a été approuvé par notre équipe.</p>
      <p>Vous pouvez maintenant vous connecter à l'application mobile et commencer à accepter des courses.</p>
    `
  });
}
```

## Base de données

### Colonne ajoutée

```sql
-- Table: drivers
approved BOOLEAN DEFAULT false NOT NULL
```

### Index créé

```sql
CREATE INDEX idx_drivers_approved ON drivers(approved);
```

## Tests

Pour tester le système :

1. Créer un nouveau compte chauffeur via l'application mobile
2. Tenter de se connecter → Devrait afficher "En attente de validation"
3. Se connecter à l'interface admin
4. Aller sur `/admin/pending-drivers`
5. Approuver le chauffeur
6. Retourner sur l'application mobile et se connecter → Devrait fonctionner
