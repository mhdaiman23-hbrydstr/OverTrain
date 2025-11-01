-- =====================================================================
-- PRODUCTION TEMPLATE INSERTION
-- Template: 3 Day Full Body Beginner
-- Total Weeks: 8 (Single 8-week block)
-- Block Structure: Linear progression with deload in Week 8
-- =====================================================================

-- Step 1: Insert program_templates record
-- This is the master template record
INSERT INTO program_templates (
  id,
  name,
  description,
  days_per_week,
  total_weeks,
  progression_type,
  is_public
) VALUES (
  gen_random_uuid()::text::uuid as template_id,
  '3 Day Full Body Beginner',
  'A beginner-friendly 3-day full body program designed for muscle growth and strength development. 8 weeks with linear progression and deload week.',
  3,
  8,
  'linear',
  true
)
RETURNING id INTO template_id;

-- Step 2: Insert RIR/RPE Progression Configuration (8-week block)
-- Auto-generated progression pattern for 8-week blocks
-- RIR (Reps In Reserve) and RPE (Rate of Perceived Exertion) values
-- W1: RIR 3 / RPE 7.0 - Technical focus, controlled intensity
-- W2: RIR 3 / RPE 7.0 - Build consistency
-- W3: RIR 2 / RPE 8.0 - Increase demand
-- W4: RIR 2 / RPE 8.0 - Maintain intensity
-- W5: RIR 1 / RPE 9.0 - Push harder
-- W6: RIR 1 / RPE 9.0 - Maintain challenge
-- W7: RIR 0 / RPE 10.0 - Go to failure
-- W8: RIR 8 / RPE 2.0 - Deload week (recovery)

INSERT INTO program_progression_config (program_template_id, block_length, week_number, rir_value, rpe_value)
VALUES
  (template_id, 8, 1, 3, 7.0),   -- Week 1: RIR 3, RPE 7.0
  (template_id, 8, 2, 3, 7.0),   -- Week 2: RIR 3, RPE 7.0
  (template_id, 8, 3, 2, 8.0),   -- Week 3: RIR 2, RPE 8.0
  (template_id, 8, 4, 2, 8.0),   -- Week 4: RIR 2, RPE 8.0
  (template_id, 8, 5, 1, 9.0),   -- Week 5: RIR 1, RPE 9.0
  (template_id, 8, 6, 1, 9.0),   -- Week 6: RIR 1, RPE 9.0
  (template_id, 8, 7, 0, 10.0),  -- Week 7: RIR 0, RPE 10.0
  (template_id, 8, 8, 8, 2.0);   -- Week 8: RIR 8, RPE 2.0 (Deload)

-- Step 3: Insert workout days (3 days per week)
-- Day 1: Full Body A
INSERT INTO program_template_days (
  id,
  program_template_id,
  day_number,
  day_name
) VALUES (
  gen_random_uuid()::text::uuid as day1_id,
  template_id,
  1,
  'Full Body A'
)
RETURNING id INTO day1_id;

-- Day 2: Full Body B
INSERT INTO program_template_days (
  id,
  program_template_id,
  day_number,
  day_name
) VALUES (
  gen_random_uuid()::text::uuid as day2_id,
  template_id,
  2,
  'Full Body B'
)
RETURNING id INTO day2_id;

-- Day 3: Full Body C
INSERT INTO program_template_days (
  id,
  program_template_id,
  day_number,
  day_name
) VALUES (
  gen_random_uuid()::text::uuid as day3_id,
  template_id,
  3,
  'Full Body C'
)
RETURNING id INTO day3_id;

-- Step 4: Insert exercises for Day 1 (Full Body A)
INSERT INTO program_template_exercises (
  id,
  template_day_id,
  exercise_library_id,
  exercise_name,
  exercise_order,
  target_sets,
  target_rep_range,
  rest_seconds,
  category
) VALUES
  (gen_random_uuid(), day1_id, '4cd57561-373d-4610-9641-b0dd2184e0f2'::uuid, 'Belt Squat', 1, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day1_id, '3b2438bf-eca7-4445-be14-c409f5a9eec5'::uuid, 'Bench Press (Flat)', 2, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day1_id, '181c4d4e-1902-462a-8c05-5bff33554765'::uuid, 'T-Bar Row', 3, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day1_id, 'ffea652a-37ce-44ca-aec1-797890f26d54'::uuid, 'Leg Press', 4, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day1_id, '97b539a9-05a1-47f7-91ef-86566b1c4bcc'::uuid, 'Lat Pulldown (Wide Grip)', 5, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day1_id, 'bc091a8d-0c63-4c16-84be-edd100bfe8dd'::uuid, 'Lying Leg Curl', 6, 3, '8-12', 90, 'isolation');

-- Step 5: Insert exercises for Day 2 (Full Body B)
INSERT INTO program_template_exercises (
  id,
  template_day_id,
  exercise_library_id,
  exercise_name,
  exercise_order,
  target_sets,
  target_rep_range,
  rest_seconds,
  category
) VALUES
  (gen_random_uuid(), day2_id, 'a15d8beb-f7e9-4d83-8b5f-b7d60f9f9c97'::uuid, 'Deadlift', 1, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day2_id, '2a542d55-bf23-44c3-b93f-c1ff2c6464cc'::uuid, 'Machine Shoulder Press', 2, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day2_id, '4ca59250-6d8e-4f75-87e1-8ad0d0cf0a25'::uuid, 'Assisted Pullup', 3, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day2_id, 'b009f359-e4eb-4c07-b765-464875d0a945'::uuid, 'Reverse Lunge', 4, 3, '8-12', 90, 'isolation'),
  (gen_random_uuid(), day2_id, '3ac66e9a-7999-4851-a28f-79e39d47eb83'::uuid, 'Leg Extension', 5, 3, '8-12', 90, 'isolation'),
  (gen_random_uuid(), day2_id, '373ba96a-d33f-4367-b374-b95a491c1a5a'::uuid, 'Calf Raises', 6, 3, '8-12', 90, 'isolation');

-- Step 6: Insert exercises for Day 3 (Full Body C)
INSERT INTO program_template_exercises (
  id,
  template_day_id,
  exercise_library_id,
  exercise_name,
  exercise_order,
  target_sets,
  target_rep_range,
  rest_seconds,
  category
) VALUES
  (gen_random_uuid(), day3_id, '8795ec80-8c63-473c-88ae-c4538c2f2cbd'::uuid, 'Dumbbell Bench Wrist Curl', 1, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day3_id, 'cdfc95a2-3838-492a-ae81-d21ded82d396'::uuid, 'Barbell Hip Thrust', 2, 3, '8-12', 150, 'compound'),
  (gen_random_uuid(), day3_id, '5e209c4f-0860-451a-b153-072e5699a34f'::uuid, 'Machine Lateral Raise', 3, 3, '8-12', 90, 'isolation'),
  (gen_random_uuid(), day3_id, 'a2fca44b-ca08-40e3-b7f2-2877e2febccd'::uuid, 'Cable Rope Facepull', 4, 3, '8-12', 90, 'isolation'),
  (gen_random_uuid(), day3_id, '6380c542-7190-4253-95cc-940599340097'::uuid, 'Cable Curl', 5, 3, '8-12', 90, 'isolation'),
  (gen_random_uuid(), day3_id, '608f2772-a173-4a8c-a030-24297159578b'::uuid, 'Cable Tricep Kickback', 6, 3, '8-12', 90, 'isolation');

-- =====================================================================
-- VERIFICATION QUERIES
-- Run these after the inserts to verify data integrity
-- =====================================================================

-- Verify template was created
SELECT
  id,
  name,
  days_per_week,
  total_weeks,
  progression_type,
  is_public,
  created_at
FROM program_templates
WHERE name = '3 Day Full Body Beginner';

-- Verify RIR/RPE progression config (should be 8 rows)
SELECT
  program_template_id,
  block_length,
  week_number,
  rir_value,
  rpe_value
FROM program_progression_config
WHERE program_template_id = (
  SELECT id FROM program_templates
  WHERE name = '3 Day Full Body Beginner'
)
ORDER BY week_number;

-- Verify workout days (should be 3 rows)
SELECT
  id,
  day_number,
  day_name
FROM program_template_days
WHERE program_template_id = (
  SELECT id FROM program_templates
  WHERE name = '3 Day Full Body Beginner'
)
ORDER BY day_number;

-- Verify exercises per day
SELECT
  ptd.day_number,
  ptd.day_name,
  COUNT(*) as exercise_count
FROM program_template_days ptd
JOIN program_template_exercises pte ON pte.template_day_id = ptd.id
WHERE ptd.program_template_id = (
  SELECT id FROM program_templates
  WHERE name = '3 Day Full Body Beginner'
)
GROUP BY ptd.day_number, ptd.day_name
ORDER BY ptd.day_number;

-- Total count of all exercises
SELECT
  COUNT(*) as total_exercises
FROM program_template_exercises pte
JOIN program_template_days ptd ON pte.template_day_id = ptd.id
WHERE ptd.program_template_id = (
  SELECT id FROM program_templates
  WHERE name = '3 Day Full Body Beginner'
);
