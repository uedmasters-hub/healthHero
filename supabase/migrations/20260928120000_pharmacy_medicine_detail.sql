-- Medicine detail page: pack shot, salt composition and a structured
-- monograph per product, plus "frequently bought together" from order history.
-- Additive and idempotent. The app reads these columns when present and falls
-- back gracefully when this migration has not been applied yet.

ALTER TABLE public.drugs
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS salt_composition text,
  ADD COLUMN IF NOT EXISTS monograph jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.drugs.monograph IS
  'Patient information by tab. Keys: dosage, side_effects, uses, warnings, precautions, interactions, how_to_take, storage. Each value is an array of short sentences.';

-- Same view, three columns appended (CREATE OR REPLACE keeps existing grants).
CREATE OR REPLACE VIEW public.pharmacy_catalog
WITH (security_invoker = true) AS
SELECT
  d.id,
  d.slug,
  d.name,
  d.generic_name,
  d.manufacturer,
  d.drug_class,
  d.dosage_form,
  d.strength,
  d.category,
  d.description,
  d.pack_label,
  d.requires_prescription,
  COALESCE(SUM(i.quantity) FILTER (WHERE i.is_active AND i.quantity > 0 AND p.is_active), 0)::integer AS stock_qty,
  MIN(i.unit_price) FILTER (WHERE i.is_active AND i.quantity > 0 AND p.is_active) AS price,
  MIN(i.mrp) FILTER (WHERE i.is_active AND i.quantity > 0 AND p.is_active) AS mrp,
  MIN(p.typical_eta_minutes) FILTER (WHERE i.is_active AND i.quantity > 0 AND p.is_active AND p.delivers) AS eta_minutes,
  d.image_url,
  d.salt_composition,
  d.monograph
FROM public.drugs d
LEFT JOIN public.pharmacy_inventory i ON i.drug_id = d.id
LEFT JOIN public.pharmacies p ON p.id = i.pharmacy_id
WHERE d.is_active
GROUP BY d.id;

GRANT SELECT ON public.pharmacy_catalog TO anon, authenticated;

-- Products most often ordered with p_drug_id. Aggregates across all orders
-- but returns only public catalog rows, never order or user data.
CREATE OR REPLACE FUNCTION public.pharmacy_frequently_bought_together(
  p_drug_id uuid,
  p_limit integer DEFAULT 6
) RETURNS SETOF public.pharmacy_catalog
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT c.*
  FROM public.pharmacy_catalog c
  JOIN (
    SELECT other.drug_id, COUNT(DISTINCT other.order_id) AS orders
    FROM public.pharmacy_order_items mine
    JOIN public.pharmacy_order_items other
      ON other.order_id = mine.order_id AND other.drug_id <> mine.drug_id
    WHERE mine.drug_id = p_drug_id
    GROUP BY other.drug_id
  ) paired ON paired.drug_id = c.id
  WHERE c.stock_qty > 0
  ORDER BY paired.orders DESC, c.name
  LIMIT LEAST(GREATEST(COALESCE(p_limit, 6), 1), 12);
$$;

REVOKE ALL ON FUNCTION public.pharmacy_frequently_bought_together(uuid, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.pharmacy_frequently_bought_together(uuid, integer) TO anon, authenticated;

-- Label-level patient information for the seeded catalog. Conservative by
-- design: general directions and safety notes only; the prescriber and the
-- pack label stay authoritative. Only fills rows that are still empty.
UPDATE public.drugs d
SET
  salt_composition = COALESCE(d.salt_composition, seed.salt_composition),
  monograph = seed.monograph
FROM (VALUES
  ('paracetamol-500', 'Paracetamol', '{"uses": ["Fever", "Mild to moderate pain such as headache, toothache, period pain and body ache"], "dosage": ["Adults and children 12 years and over: 1–2 tablets (500–1000 mg) every 4–6 hours when needed.", "Do not take more than 8 tablets (4 g) in 24 hours.", "Children under 12: ask a doctor or pharmacist for a weight-based dose."], "how_to_take": ["Swallow with a glass of water, with or without food.", "Leave at least 4 hours between doses."], "side_effects": ["Side effects are uncommon at the usual dose.", "Rarely: skin rash or an allergic reaction — stop and see a doctor."], "warnings": ["Taking too much can cause serious liver damage, even if you feel well. Get urgent help after an overdose.", "Do not take with other medicines that contain paracetamol."], "precautions": ["Ask a doctor first if you have liver or kidney disease, drink alcohol regularly, or weigh under 50 kg."], "interactions": ["Other paracetamol-containing cold and flu products.", "Warfarin — regular use can change its effect.", "Alcohol increases the risk of liver harm."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('cetirizine-10', 'Cetirizine hydrochloride', '{"uses": ["Hay fever and allergic rhinitis — sneezing, runny or itchy nose, watery eyes", "Itchy skin rashes and hives (urticaria)"], "dosage": ["Adults and children 12 years and over: one 10 mg tablet once a day.", "Children under 12: ask a doctor or pharmacist."], "how_to_take": ["Swallow with water, with or without food.", "Take it in the evening if it makes you drowsy."], "side_effects": ["Drowsiness or tiredness", "Dry mouth", "Headache"], "warnings": ["May cause drowsiness. Do not drive or use machines if affected."], "precautions": ["Ask a doctor first if you have kidney disease, epilepsy, trouble passing urine, or are pregnant or breastfeeding."], "interactions": ["Alcohol and other medicines that cause drowsiness can add to the sleepiness."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('amoxicillin-500', 'Amoxicillin (as trihydrate)', '{"uses": ["Bacterial infections your doctor has diagnosed — for example of the ear, throat, chest or urinary tract.", "It does not work for colds or flu."], "dosage": ["Take exactly as prescribed — the dose and length of the course depend on the infection."], "how_to_take": ["Swallow whole with water, with or without food.", "Space doses evenly through the day.", "Finish the full course, even if you feel better."], "side_effects": ["Diarrhoea, nausea", "Skin rash", "Thrush (yeast infection)"], "warnings": ["Do not take if you are allergic to penicillin.", "Get urgent help for a rash with swelling of the face or trouble breathing.", "Tell your doctor about severe or bloody diarrhoea."], "precautions": ["Tell your doctor if you have kidney problems, glandular fever, or have reacted to any antibiotic before."], "interactions": ["Methotrexate", "Warfarin and other blood thinners", "Allopurinol — higher chance of rash"], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('metformin-500', 'Metformin hydrochloride', '{"uses": ["Type 2 diabetes, alongside diet and exercise"], "dosage": ["Take exactly as prescribed. The dose is usually started low and increased gradually."], "how_to_take": ["Take with or just after a meal to reduce stomach upset.", "Swallow whole with water."], "side_effects": ["Nausea, diarrhoea, stomach ache — usually settle within a few weeks", "Metallic taste", "Lower vitamin B12 with long-term use"], "warnings": ["Rarely causes lactic acidosis. Get urgent help for vomiting, severe stomach pain, muscle cramps or fast breathing."], "precautions": ["Tell your doctor about kidney or liver problems.", "It may need to be paused before surgery or an X-ray scan that uses contrast dye.", "Avoid heavy drinking."], "interactions": ["Iodinated contrast dyes", "Alcohol", "Steroids and some diuretics can raise blood sugar"], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('digital-thermometer', NULL, '{"uses": ["Checking body temperature by mouth or under the arm"], "how_to_take": ["Clean the tip before and after use.", "Place it under the tongue or deep in the armpit and keep still until it beeps.", "Wait 15 minutes after eating or drinking before an oral reading."], "warnings": ["See a doctor for any fever in a baby under 3 months, or a fever that is high or lasts more than 3 days."], "storage": ["Wipe the tip with an alcohol swab and keep it in its case.", "Keep out of reach of children."]}'::jsonb),
  ('bp-monitor', NULL, '{"uses": ["Checking blood pressure and pulse at home"], "how_to_take": ["Sit and rest for 5 minutes, feet flat, arm supported at heart level.", "Wrap the cuff on the bare upper arm; do not talk during the reading.", "Take two readings a minute apart and note both."], "warnings": ["A home monitor does not diagnose. Share your readings with your doctor.", "Get urgent care for a very high reading with chest pain, severe headache, confusion or weakness."], "storage": ["Store the cuff loosely coiled, away from heat and moisture.", "Remove batteries if unused for a long time."]}'::jsonb),
  ('vitamin-d3', 'Cholecalciferol (Vitamin D3)', '{"uses": ["Keeping vitamin D at healthy levels", "Bone and muscle health"], "dosage": ["One tablet a day, or as your doctor advises."], "how_to_take": ["Take with a meal — vitamin D is absorbed better with food."], "side_effects": ["Rare at the recommended dose.", "Too much can raise calcium: thirst, nausea, constipation, tiredness."], "warnings": ["Do not take more than the recommended dose."], "precautions": ["Ask a doctor first if you have kidney stones, high calcium, or sarcoidosis."], "interactions": ["Thiazide diuretics can raise calcium further.", "Some epilepsy medicines and orlistat can lower vitamin D levels."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('depura-d3', 'Cholecalciferol (Vitamin D3)', '{"uses": ["Treating or preventing vitamin D deficiency, as advised by a doctor"], "dosage": ["High-strength dose (60,000 IU). It is usually taken once a week or once a month — only as your doctor advises.", "This is not a daily supplement."], "how_to_take": ["Take the whole bottle directly or mixed with a little milk or water, with a meal."], "side_effects": ["Too much can raise calcium: thirst, nausea, constipation, tiredness, confusion."], "warnings": ["Do not take it more often than advised — vitamin D builds up in the body."], "precautions": ["Ask a doctor first if you have kidney stones, high calcium, or sarcoidosis."], "interactions": ["Thiazide diuretics", "Other vitamin D or calcium supplements"], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('ors', 'Oral rehydration salts (sodium chloride, potassium chloride, sodium citrate, glucose)', '{"uses": ["Replacing fluid and salts lost through diarrhoea or vomiting"], "dosage": ["Follow the amounts on the pack. Give small, frequent sips after each loose stool."], "how_to_take": ["Dissolve one sachet in exactly the volume of clean drinking water printed on the pack.", "Do not add sugar or salt. Use the solution within 24 hours."], "warnings": ["Get medical help for blood in the stool, a high fever, repeated vomiting, or signs of dehydration in a child (very little urine, sunken eyes, unusual sleepiness)."], "precautions": ["Ask a doctor first if you have kidney disease or heart failure."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('everherb-amla-juice', 'Amla (Emblica officinalis)', '{"uses": ["A daily source of vitamin C to support immunity"], "dosage": ["Follow the serving size on the pack."], "how_to_take": ["Mix with water and drink, usually before a meal. Shake well before use."], "side_effects": ["Acidity or loose stools in some people"], "precautions": ["Ask a doctor first if you are pregnant or breastfeeding."], "interactions": ["If you take medicines for diabetes or blood thinners, ask your doctor first."], "storage": ["Refrigerate after opening and use within the time printed on the label.", "Keep out of reach of children."]}'::jsonb),
  ('savlon-surface-spray', NULL, '{"uses": ["Disinfecting hard surfaces — tables, handles, switches and floors"], "how_to_take": ["Spray from about 20–30 cm until the surface is wet.", "Leave for the contact time on the label, then wipe."], "warnings": ["For surfaces only — not for skin, eyes or swallowing.", "Keep away from heat and flames."], "precautions": ["Use in a well-ventilated room. Keep food and pets away until dry."], "storage": ["Store upright in a cool place away from sunlight.", "Keep out of reach of children."]}'::jsonb),
  ('dettol-surface-sanitizer', NULL, '{"uses": ["Sanitising hard surfaces around the home"], "how_to_take": ["Spray until the surface is wet, leave for the time on the label, then wipe or let dry."], "warnings": ["For surfaces only — not for skin, eyes or swallowing.", "Keep away from heat and flames."], "precautions": ["Use in a well-ventilated room. Keep food and pets away until dry."], "storage": ["Store upright in a cool place away from sunlight.", "Keep out of reach of children."]}'::jsonb),
  ('dettol-sanitizer-spray', NULL, '{"uses": ["Sanitising hands and surfaces when soap and water are not available"], "how_to_take": ["Spray onto hands and rub until dry, or spray a surface and leave to dry."], "warnings": ["Flammable — keep away from flames and heat.", "Avoid the eyes. Not for swallowing."], "storage": ["Store below 30°C, away from sunlight.", "Keep out of reach of children."]}'::jsonb),
  ('all-in-one-vaporizer', NULL, '{"uses": ["Steam inhalation for a blocked nose during a cold"], "how_to_take": ["Fill with water up to the mark — never overfill.", "Plug in, let steam build, and breathe it in from a comfortable distance.", "Unplug before refilling or cleaning."], "warnings": ["Hot water and steam can burn. Keep out of reach of children and never leave it running unattended."], "storage": ["Empty, dry and store once cool."]}'::jsonb),
  ('revital-h-women', NULL, '{"uses": ["Daily nutritional support when your diet falls short"], "dosage": ["One a day, or as advised on the pack."], "how_to_take": ["Swallow with water after a meal."], "side_effects": ["Mild stomach upset", "Harmless bright yellow urine (from vitamin B2)"], "warnings": ["Do not exceed the stated dose. Not a substitute for a varied diet."], "precautions": ["Ask a doctor first if you are pregnant, breastfeeding, or take regular medicines."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."], "interactions": ["Ginseng may interact with blood thinners, diabetes medicines and some antidepressants — ask your doctor first."]}'::jsonb),
  ('revital-h-men', NULL, '{"uses": ["Daily nutritional support when your diet falls short"], "dosage": ["One a day, or as advised on the pack."], "how_to_take": ["Swallow with water after a meal."], "side_effects": ["Mild stomach upset", "Harmless bright yellow urine (from vitamin B2)"], "warnings": ["Do not exceed the stated dose. Not a substitute for a varied diet."], "precautions": ["Ask a doctor first if you are pregnant, breastfeeding, or take regular medicines."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."], "interactions": ["Ginseng may interact with blood thinners, diabetes medicines and some antidepressants — ask your doctor first."]}'::jsonb),
  ('daily-multivitamin-60', NULL, '{"uses": ["Daily nutritional support when your diet falls short"], "dosage": ["One a day, or as advised on the pack."], "how_to_take": ["Swallow with water after a meal."], "side_effects": ["Mild stomach upset", "Harmless bright yellow urine (from vitamin B2)"], "warnings": ["Do not exceed the stated dose. Not a substitute for a varied diet."], "precautions": ["Ask a doctor first if you are pregnant, breastfeeding, or take regular medicines."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('dettol-handwash', NULL, '{"uses": ["Everyday hand washing"], "how_to_take": ["Wet hands, apply, lather for 20 seconds, rinse and dry."], "warnings": ["For external use. If it gets in the eyes, rinse well with water."], "storage": ["Keep out of reach of children."]}'::jsonb),
  ('everherb-ashwagandha', 'Ashwagandha (Withania somnifera) root extract', '{"uses": ["A traditional herb used for stress and everyday energy"], "dosage": ["Follow the dose on the pack."], "how_to_take": ["Swallow with water after a meal."], "side_effects": ["Stomach upset, loose stools", "Drowsiness"], "warnings": ["Do not use in pregnancy."], "precautions": ["Ask a doctor first if you have a thyroid or autoimmune condition, or are having surgery."], "interactions": ["Sedatives and sleeping tablets", "Thyroid medicines", "Diabetes and blood pressure medicines", "Medicines that suppress the immune system"], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('becozym-c-forte', 'Vitamin B complex + Vitamin C + Biotin', '{"uses": ["Vitamin B and vitamin C support, for example during recovery or when the diet is poor"], "dosage": ["One tablet a day, or as your doctor advises."], "how_to_take": ["Swallow with water after a meal."], "side_effects": ["Harmless bright yellow urine", "Mild stomach upset"], "precautions": ["Ask a doctor first if you are pregnant or breastfeeding."], "interactions": ["If you take levodopa for Parkinson’s disease, ask your doctor first (vitamin B6)."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('bpl-pulse-oximeter', NULL, '{"uses": ["Checking blood oxygen (SpO₂) and pulse rate at home"], "how_to_take": ["Rest for a few minutes and warm your hands.", "Remove nail polish, place a finger fully inside and stay still.", "Read once the numbers stop changing."], "warnings": ["Cold hands, movement, nail polish and darker skin tones can make readings less accurate.", "Get urgent help if you are breathless or the reading is 92% or lower."], "storage": ["Keep dry; remove batteries if unused for a long time."]}'::jsonb),
  ('dettol-antiseptic', 'Chloroxylenol', '{"uses": ["First aid for cuts, grazes and insect bites", "Household hygiene"], "how_to_take": ["Always dilute with water as shown on the label before using on skin."], "warnings": ["Never use undiluted on skin. Not for swallowing. Keep out of the eyes.", "Stop using if the skin becomes irritated."], "storage": ["Keep out of reach of children.", "Store with the cap closed."]}'::jsonb),
  ('dettol-hand-rub', NULL, '{"uses": ["Cleaning hands when soap and water are not available"], "how_to_take": ["Apply a palmful and rub over all surfaces of the hands for 20–30 seconds until dry."], "warnings": ["Flammable — keep away from flames.", "Avoid the eyes. Not for swallowing; supervise children."], "storage": ["Store below 30°C with the cap closed.", "Keep out of reach of children."]}'::jsonb),
  ('sbl-no-8', NULL, '{"uses": ["A homeopathic preparation — see the label for what it is used for."], "dosage": ["Follow the dose on the label or from your homeopathic practitioner."], "how_to_take": ["Usually taken in a little water, away from strong flavours such as coffee or mint."], "warnings": ["Drops are usually made with alcohol — check the label if you avoid alcohol.", "See a doctor if symptoms continue or get worse."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('vicks-vaporub', 'Camphor, menthol, eucalyptus oil', '{"uses": ["Relief of cold symptoms — blocked nose, cough and minor muscle aches"], "dosage": ["Adults and children 2 years and over: apply up to 3 times a day."], "how_to_take": ["Rub a thick layer on the chest and throat. You can cover with a warm, dry cloth."], "side_effects": ["Skin irritation or redness"], "warnings": ["For external use only. Do not use in the nostrils, on wounds or broken skin, or near the eyes.", "Not for children under 2. Do not heat or microwave."], "precautions": ["Ask a doctor first if you have asthma or a long-lasting cough."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('baidyanath-chyawanprash', NULL, '{"uses": ["A traditional ayurvedic tonic used for immunity and energy"], "dosage": ["Follow the serving size on the pack; children usually take less than adults."], "how_to_take": ["Take with warm milk or water, preferably in the morning."], "precautions": ["Contains sugar or honey — ask a doctor first if you have diabetes."], "storage": ["Close the lid tightly and always use a dry spoon.", "Keep out of reach of children."]}'::jsonb),
  ('vitamin-c-zinc', 'Ascorbic acid (Vitamin C) + Zinc', '{"uses": ["Vitamin C and zinc support for immunity"], "dosage": ["One tablet a day, or as advised on the pack."], "how_to_take": ["Swallow with water after a meal."], "side_effects": ["Stomach upset or loose stools at high doses", "Nausea (zinc)"], "precautions": ["Ask a doctor first if you have had kidney stones."], "interactions": ["Zinc can reduce absorption of some antibiotics (tetracyclines, quinolones) — take them at least 2 hours apart."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb),
  ('amrutanjan-inhaler', NULL, '{"uses": ["Quick relief from a blocked nose"], "dosage": ["Use as often as needed, as directed on the pack."], "how_to_take": ["Remove the cap, place the tip at one nostril, close the other and breathe in gently.", "Close the cap tightly after use."], "warnings": ["Do not share your inhaler. Keep away from the eyes."], "storage": ["Store in a cool, dry place below 30°C, away from direct sunlight. Keep out of reach of children."]}'::jsonb)
) AS seed (slug, salt_composition, monograph)
WHERE d.slug = seed.slug
  AND (d.monograph IS NULL OR d.monograph = '{}'::jsonb);
