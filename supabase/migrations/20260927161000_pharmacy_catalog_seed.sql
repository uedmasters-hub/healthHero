-- Store catalog borrowed from the public PharmEasy-clone product list
-- (nidhishpareek/pharmeasyclone docs/db.json): names, brands, pack size, and prices.
-- Descriptions are short originals. Every active pharmacy receives the same shelf
-- so choosing a store opens a shop with stock.

INSERT INTO public.drugs (
  slug, name, generic_name, manufacturer, drug_class, dosage_form, strength,
  category, description, pack_label, requires_prescription, is_active
)
SELECT * FROM (VALUES
  ('everherb-amla-juice', 'Everherb Amla Juice', 'Amla', 'Everherb', 'Immunity', 'Liquid', NULL, 'wellness', 'A vitamin C juice for everyday immunity.', '1 litre', false, true),
  ('savlon-surface-spray', 'Savlon Surface Disinfectant Spray', NULL, 'Savlon', 'Hygiene', 'Spray', NULL, 'wellness', 'A surface spray for tables, handles, and floors.', '170 g', false, true),
  ('all-in-one-vaporizer', 'All-in-one vaporizer', NULL, 'PharmEasy', 'Respiratory', 'Device', NULL, 'equipment', 'A home vaporizer for steam inhalation.', '1 device', false, true),
  ('revital-h-women', 'Revital H Women Multivitamin', NULL, 'Revital', 'Vitamins', 'Tablet', NULL, 'wellness', 'A daily multivitamin with calcium, zinc, and ginseng.', '30 tablets', false, true),
  ('dettol-handwash', 'Dettol Liquid Handwash Refill', NULL, 'Dettol', 'Hygiene', 'Liquid', NULL, 'wellness', 'A germ-protection handwash refill.', '175 ml', false, true),
  ('revital-h-men', 'Revital H Men Multivitamin', NULL, 'Revital', 'Vitamins', 'Capsule', NULL, 'wellness', 'A daily multivitamin with calcium, zinc, and ginseng.', '30 capsules', false, true),
  ('everherb-ashwagandha', 'Everherb Ashwagandha Capsules', 'Ashwagandha', 'Everherb', 'Wellness', 'Capsule', NULL, 'wellness', 'Ashwagandha capsules for stress and daily energy.', '60 capsules', false, true),
  ('depura-d3', 'Depura Vitamin D3 Oral Solution', 'Cholecalciferol', 'Depura', 'Vitamins', 'Liquid', '60000 IU', 'wellness', 'A vitamin D3 solution for bone health.', '1 bottle', false, true),
  ('dettol-sanitizer-spray', 'Dettol Disinfectant Sanitizer Spray', NULL, 'Dettol', 'Hygiene', 'Spray', NULL, 'wellness', 'A disinfectant spray for hands and surfaces.', '225 ml', false, true),
  ('becozym-c-forte', 'Becozym C Forte', 'Vitamin B complex', 'Becozym', 'Vitamins', 'Tablet', NULL, 'medicine', 'Vitamin B complex with biotin and vitamin C.', '15 tablets', false, true),
  ('bpl-pulse-oximeter', 'BPL Smart Oxy Pulse Oximeter', NULL, 'BPL', 'Monitoring', 'Device', NULL, 'equipment', 'A fingertip pulse oximeter.', '1 device', false, true),
  ('dettol-surface-sanitizer', 'Dettol Surface Sanitizer Spray', NULL, 'Dettol', 'Hygiene', 'Spray', NULL, 'wellness', 'A surface sanitizer spray.', '500 ml', false, true),
  ('dettol-antiseptic', 'Dettol Antiseptic Liquid', NULL, 'Dettol', 'Hygiene', 'Liquid', NULL, 'wellness', 'An antiseptic liquid for cuts and household use.', '550 ml', false, true),
  ('sbl-no-8', 'SBL No. 8 Drops', NULL, 'SBL', 'Homeopathy', 'Drops', NULL, 'medicine', 'Homeopathic drops.', '30 ml', false, true),
  ('daily-multivitamin-60', 'Daily Multivitamin Multimineral', NULL, 'Liveasy', 'Vitamins', 'Tablet', NULL, 'wellness', 'A 60-tablet multivitamin and mineral supplement.', '60 tablets', false, true),
  ('vicks-vaporub', 'Vicks VapoRub', NULL, 'Vicks', 'Cold & cough', 'Ointment', NULL, 'medicine', 'A rub for cold, cough, and headache.', '25 ml', false, true),
  ('baidyanath-chyawanprash', 'Baidyanath Chyawanprash Special', NULL, 'Baidyanath', 'Ayurveda', 'Paste', NULL, 'wellness', 'An ayurvedic immunity paste.', '500 g', false, true),
  ('vitamin-c-zinc', 'Vitamin C with Zinc', 'Ascorbic acid', 'Liveasy', 'Vitamins', 'Tablet', '990 mg', 'wellness', 'Vitamin C tablets with zinc.', '60 tablets', false, true),
  ('dettol-hand-rub', 'Dettol Antiseptic Hand Rub', NULL, 'Dettol', 'Hygiene', 'Liquid', NULL, 'wellness', 'A clinical-strength hand rub.', '500 ml', false, true),
  ('amrutanjan-inhaler', 'Amrutanjan Relief Nasal Inhaler', NULL, 'Amrutanjan', 'Cold & cough', 'Inhaler', NULL, 'medicine', 'A pocket nasal inhaler for a blocked nose.', '0.75 g', false, true)
) AS seed (
  slug, name, generic_name, manufacturer, drug_class, dosage_form, strength,
  category, description, pack_label, requires_prescription, is_active
)
WHERE NOT EXISTS (SELECT 1 FROM public.drugs d WHERE d.slug = seed.slug);

-- Inventory for every active pharmacy is applied in hash batches by
-- scripts/seed-pharmacy-shelves.sql. One cross join of the full registry
-- exceeds the remote statement timeout.
