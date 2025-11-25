-- ============================================================================
-- MIGRATION: Création de la table accounting_entries pour la comptabilité
-- Date: 2025-11-25
-- Description: Table pour gérer la comptabilité des courses terminées
-- ============================================================================

-- Créer la table accounting_entries pour la gestion comptable
CREATE TABLE IF NOT EXISTS public.accounting_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id uuid REFERENCES public.courses(id) ON DELETE CASCADE,
  driver_id uuid REFERENCES public.drivers(id) ON DELETE CASCADE,
  driver_amount numeric NOT NULL,
  fleet_amount numeric NOT NULL,
  total_amount numeric NOT NULL,
  rating integer,
  comment text,
  payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'cancelled')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Index pour améliorer les performances
CREATE INDEX IF NOT EXISTS idx_accounting_course ON public.accounting_entries(course_id);
CREATE INDEX IF NOT EXISTS idx_accounting_driver ON public.accounting_entries(driver_id);
CREATE INDEX IF NOT EXISTS idx_accounting_status ON public.accounting_entries(payment_status);
CREATE INDEX IF NOT EXISTS idx_accounting_created ON public.accounting_entries(created_at DESC);

-- Activer RLS
ALTER TABLE public.accounting_entries ENABLE ROW LEVEL SECURITY;

-- Politique: Les chauffeurs peuvent voir leurs propres entrées comptables
DROP POLICY IF EXISTS "Drivers can view own accounting entries" ON public.accounting_entries;
CREATE POLICY "Drivers can view own accounting entries"
  ON public.accounting_entries FOR SELECT
  USING (
    driver_id IN (
      SELECT id FROM public.drivers WHERE user_id = auth.uid()
    )
  );

-- Commentaires
COMMENT ON TABLE public.accounting_entries IS 'Entrées comptables pour les courses terminées';
COMMENT ON COLUMN public.accounting_entries.driver_amount IS 'Montant revenant au chauffeur (courses.net_driver)';
COMMENT ON COLUMN public.accounting_entries.fleet_amount IS 'Montant revenant à la flotte/dispatch (courses.commission)';
COMMENT ON COLUMN public.accounting_entries.payment_status IS 'Statut du paiement: pending, paid, cancelled';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Table accounting_entries créée avec succès!';
  RAISE NOTICE '   - Les courses terminées créent automatiquement une entrée comptable';
  RAISE NOTICE '   - driver_amount = courses.net_driver (montant CHAUFFEUR)';
  RAISE NOTICE '   - fleet_amount = courses.commission (montant FLOTTE/DISPATCH)';
  RAISE NOTICE '   - Si net_driver ou commission manquent, calcul automatique (80/20)';
END $$;
