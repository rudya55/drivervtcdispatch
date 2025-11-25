-- ============================================================================
-- MIGRATION: Ajout du champ extras pour gérer les équipements spéciaux
-- Date: 2025-11-25
-- Description: Ajoute un champ dédié pour les extras (siège bébé, rehausseur, cosy, etc.)
-- ============================================================================

-- Ajouter la colonne extras à la table courses
ALTER TABLE public.courses
  ADD COLUMN IF NOT EXISTS extras text;

-- Ajouter un commentaire explicatif
COMMENT ON COLUMN public.courses.extras IS
  'Équipements spéciaux demandés: siège bébé, rehausseur, cosy, etc.';

-- Message de confirmation
DO $$
BEGIN
  RAISE NOTICE '✅ Colonne extras ajoutée à la table courses';
  RAISE NOTICE '   Cette colonne permet de stocker les équipements spéciaux séparément des notes';
END $$;
