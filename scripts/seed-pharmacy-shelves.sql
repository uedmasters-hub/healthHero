-- One hash bucket of store shelves. Replace :bucket (0–15) before running.
INSERT INTO public.pharmacy_inventory (
  pharmacy_id, drug_id, batch_number, quantity, unit_price, mrp, is_active
)
SELECT
  p.id,
  d.id,
  'STORE-OPEN',
  CASE d.category WHEN 'equipment' THEN 12 ELSE 40 END,
  CASE d.slug
    WHEN 'paracetamol-500' THEN 45
    WHEN 'cetirizine-10' THEN 60
    WHEN 'amoxicillin-500' THEN 180
    WHEN 'metformin-500' THEN 95
    WHEN 'digital-thermometer' THEN 350
    WHEN 'bp-monitor' THEN 2450
    WHEN 'vitamin-d3' THEN 320
    WHEN 'ors' THEN 80
    WHEN 'everherb-amla-juice' THEN 359
    WHEN 'savlon-surface-spray' THEN 140
    WHEN 'all-in-one-vaporizer' THEN 539
    WHEN 'revital-h-women' THEN 293
    WHEN 'dettol-handwash' THEN 40
    WHEN 'revital-h-men' THEN 264
    WHEN 'everherb-ashwagandha' THEN 539
    WHEN 'depura-d3' THEN 71
    WHEN 'dettol-sanitizer-spray' THEN 135
    WHEN 'becozym-c-forte' THEN 23
    WHEN 'bpl-pulse-oximeter' THEN 1080
    WHEN 'dettol-surface-sanitizer' THEN 104
    WHEN 'dettol-antiseptic' THEN 179
    WHEN 'sbl-no-8' THEN 155
    WHEN 'daily-multivitamin-60' THEN 629
    WHEN 'vicks-vaporub' THEN 78
    WHEN 'baidyanath-chyawanprash' THEN 147
    WHEN 'vitamin-c-zinc' THEN 719
    WHEN 'dettol-hand-rub' THEN 237
    WHEN 'amrutanjan-inhaler' THEN 45
    ELSE 100
  END,
  CASE d.slug
    WHEN 'paracetamol-500' THEN 55
    WHEN 'cetirizine-10' THEN 75
    WHEN 'amoxicillin-500' THEN 210
    WHEN 'metformin-500' THEN 120
    WHEN 'digital-thermometer' THEN 420
    WHEN 'bp-monitor' THEN 2890
    WHEN 'vitamin-d3' THEN 380
    WHEN 'ors' THEN 95
    WHEN 'everherb-amla-juice' THEN 399
    WHEN 'savlon-surface-spray' THEN 165
    WHEN 'all-in-one-vaporizer' THEN 599
    WHEN 'revital-h-women' THEN 345
    WHEN 'dettol-handwash' THEN 48
    WHEN 'revital-h-men' THEN 310
    WHEN 'everherb-ashwagandha' THEN 599
    WHEN 'depura-d3' THEN 94
    WHEN 'dettol-sanitizer-spray' THEN 159
    WHEN 'becozym-c-forte' THEN 25
    WHEN 'bpl-pulse-oximeter' THEN 3600
    WHEN 'dettol-surface-sanitizer' THEN 159
    WHEN 'dettol-antiseptic' THEN 194
    WHEN 'sbl-no-8' THEN 155
    WHEN 'daily-multivitamin-60' THEN 699
    WHEN 'vicks-vaporub' THEN 85
    WHEN 'baidyanath-chyawanprash' THEN 210
    WHEN 'vitamin-c-zinc' THEN 799
    WHEN 'dettol-hand-rub' THEN 250
    WHEN 'amrutanjan-inhaler' THEN 50
    ELSE 120
  END,
  true
FROM public.pharmacies p
JOIN public.drugs d ON d.is_active AND d.slug IS NOT NULL
WHERE p.is_active
  AND mod(abs(hashtext(p.id::text)::bigint), 16) = :bucket
  AND NOT EXISTS (
    SELECT 1 FROM public.pharmacy_inventory i
    WHERE i.pharmacy_id = p.id
      AND i.drug_id = d.id
      AND i.batch_number = 'STORE-OPEN'
  );
