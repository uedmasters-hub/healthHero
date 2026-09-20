-- Rebrand display name for the root healthcare network org.
-- Stable UUID namespaces (healthhero.center.*) are intentionally unchanged.
UPDATE public.organizations
SET name = 'eMedicalls'
WHERE id = '00000000-0000-4000-a000-000000000000'
  AND name = 'Health Hero';
