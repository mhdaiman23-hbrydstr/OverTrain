-- =====================================================================
-- INSERT: 3 Day Full Body Beginner Template
-- Date: 2025-10-31
-- Block Structure: 8-week linear progression with deload
-- RIR/RPE: Auto-generated 8-week progression pattern
-- =====================================================================

-- STEP 1: Insert the master template record
-- This template is public and available to all users for selection
WITH template_insert AS (
  INSERT INTO program_templates (
    name,
    description,
    days_per_week,
    total_weeks,
    gender,
    experience,
    progression_type,
    is_public
  ) VALUES (
    '3 Day Full Body Beginner',
    'A beginner-friendly 3-day full body program designed for muscle growth and strength development. 8 weeks of linear progression with deload in week 8.',
    3,
    8,
    ARRAY['male', 'female']::text[],
    ARRAY['beginner']::text[],
    'linear',
    true
  )
  RETURNING id AS template_id
)

-- STEP 2: Insert RIR/RPE progression config (8-week block)
-- These values are displayed on the calendar modal and guide intensity
INSERT INTO program_progression_config (program_template_id, block_length, week_number, rir_value, rpe_value)
SELECT
  template_id,
  8 AS block_length,
  week_number,
  rir_value,
  rpe_value
FROM (
  VALUES
    (1, 3, 7.0),    -- Week 1: RIR 3, RPE 7.0 - Technical focus, controlled
    (2, 3, 7.0),    -- Week 2: RIR 3, RPE 7.0 - Build consistency
    (3, 2, 8.0),    -- Week 3: RIR 2, RPE 8.0 - Increase demand
    (4, 2, 8.0),    -- Week 4: RIR 2, RPE 8.0 - Maintain intensity
    (5, 1, 9.0),    -- Week 5: RIR 1, RPE 9.0 - Push harder
    (6, 1, 9.0),    -- Week 6: RIR 1, RPE 9.0 - Maintain challenge
    (7, 0, 10.0),   -- Week 7: RIR 0, RPE 10.0 - Go to failure
    (8, 8, 2.0)     -- Week 8: RIR 8, RPE 2.0 - DELOAD (recovery week)
) AS progression(week_number, rir_value, rpe_value)
CROSS JOIN template_insert;

-- STEP 3: Insert workout days
-- Day 1: Full Body A (Squat emphasis)
INSERT INTO program_template_days (program_template_id, day_number, day_name)
SELECT id, 1, 'Full Body A' FROM program_templates WHERE name = '3 Day Full Body Beginner';

-- Day 2: Full Body B (Deadlift emphasis)
INSERT INTO program_template_days (program_template_id, day_number, day_name)
SELECT id, 2, 'Full Body B' FROM program_templates WHERE name = '3 Day Full Body Beginner';

-- Day 3: Full Body C (Accessory/Hypertrophy)
INSERT INTO program_template_days (program_template_id, day_number, day_name)
SELECT id, 3, 'Full Body C' FROM program_templates WHERE name = '3 Day Full Body Beginner';

-- STEP 4: Insert exercises for Day 1 (Full Body A)
WITH day1 AS (
  SELECT ptd.id FROM program_template_days ptd
  JOIN program_templates pt ON pt.id = ptd.program_template_id
  WHERE pt.name = '3 Day Full Body Beginner' AND ptd.day_number = 1
)
INSERT INTO program_template_exercises (template_day_id, exercise_library_id, exercise_name, exercise_order, target_sets, target_rep_range, rest_seconds, category)
SELECT
  (SELECT id FROM day1),
  exercise_id::uuid,
  exercise_name,
  exercise_order,
  sets::integer,
  reps,
  rest_seconds::integer,
  category
FROM (
  VALUES
    ('4cd57561-373d-4610-9641-b0dd2184e0f2', 'Belt Squat', 1, '3', '8-12', '150', 'compound'),
    ('3b2438bf-eca7-4445-be14-c409f5a9eec5', 'Bench Press (Flat)', 2, '3', '8-12', '150', 'compound'),
    ('181c4d4e-1902-462a-8c05-5bff33554765', 'T-Bar Row', 3, '3', '8-12', '150', 'compound'),
    ('ffea652a-37ce-44ca-aec1-797890f26d54', 'Leg Press', 4, '3', '8-12', '150', 'compound'),
    ('97b539a9-05a1-47f7-91ef-86566b1c4bcc', 'Lat Pulldown (Wide Grip)', 5, '3', '8-12', '150', 'compound'),
    ('bc091a8d-0c63-4c16-84be-edd100bfe8dd', 'Lying Leg Curl', 6, '3', '8-12', '90', 'isolation')
) AS exercises(exercise_id, exercise_name, exercise_order, sets, reps, rest_seconds, category);

-- STEP 5: Insert exercises for Day 2 (Full Body B)
WITH day2 AS (
  SELECT ptd.id FROM program_template_days ptd
  JOIN program_templates pt ON pt.id = ptd.program_template_id
  WHERE pt.name = '3 Day Full Body Beginner' AND ptd.day_number = 2
)
INSERT INTO program_template_exercises (template_day_id, exercise_library_id, exercise_name, exercise_order, target_sets, target_rep_range, rest_seconds, category)
SELECT
  (SELECT id FROM day2),
  exercise_id::uuid,
  exercise_name,
  exercise_order,
  sets::integer,
  reps,
  rest_seconds::integer,
  category
FROM (
  VALUES
    ('a15d8beb-f7e9-4d83-8b5f-b7d60f9f9c97', 'Deadlift', 1, '3', '8-12', '150', 'compound'),
    ('2a542d55-bf23-44c3-b93f-c1ff2c6464cc', 'Machine Shoulder Press', 2, '3', '8-12', '150', 'compound'),
    ('4ca59250-6d8e-4f75-87e1-8ad0d0cf0a25', 'Assisted Pullup', 3, '3', '8-12', '150', 'compound'),
    ('b009f359-e4eb-4c07-b765-464875d0a945', 'Reverse Lunge', 4, '3', '8-12', '90', 'isolation'),
    ('3ac66e9a-7999-4851-a28f-79e39d47eb83', 'Leg Extension', 5, '3', '8-12', '90', 'isolation'),
    ('373ba96a-d33f-4367-b374-b95a491c1a5a', 'Calf Raises', 6, '3', '8-12', '90', 'isolation')
) AS exercises(exercise_id, exercise_name, exercise_order, sets, reps, rest_seconds, category);

-- STEP 6: Insert exercises for Day 3 (Full Body C)
WITH day3 AS (
  SELECT ptd.id FROM program_template_days ptd
  JOIN program_templates pt ON pt.id = ptd.program_template_id
  WHERE pt.name = '3 Day Full Body Beginner' AND ptd.day_number = 3
)
INSERT INTO program_template_exercises (template_day_id, exercise_library_id, exercise_name, exercise_order, target_sets, target_rep_range, rest_seconds, category)
SELECT
  (SELECT id FROM day3),
  exercise_id::uuid,
  exercise_name,
  exercise_order,
  sets::integer,
  reps,
  rest_seconds::integer,
  category
FROM (
  VALUES
    ('8795ec80-8c63-473c-88ae-c4538c2f2cbd', 'Dumbbell Bench Wrist Curl', 1, '3', '8-12', '150', 'compound'),
    ('cdfc95a2-3838-492a-ae81-d21ded82d396', 'Barbell Hip Thrust', 2, '3', '8-12', '150', 'compound'),
    ('5e209c4f-0860-451a-b153-072e5699a34f', 'Machine Lateral Raise', 3, '3', '8-12', '90', 'isolation'),
    ('a2fca44b-ca08-40e3-b7f2-2877e2febccd', 'Cable Rope Facepull', 4, '3', '8-12', '90', 'isolation'),
    ('6380c542-7190-4253-95cc-940599340097', 'Cable Curl', 5, '3', '8-12', '90', 'isolation'),
    ('608f2772-a173-4a8c-a030-24297159578b', 'Cable Tricep Kickback', 6, '3', '8-12', '90', 'isolation')
) AS exercises(exercise_id, exercise_name, exercise_order, sets, reps, rest_seconds, category);

-- =====================================================================
-- VERIFICATION: Run these queries to verify successful insertion
-- =====================================================================

-- Check 1: Template created
SELECT COUNT(*) AS template_count FROM program_templates WHERE name = '3 Day Full Body Beginner';

-- Check 2: RIR/RPE progression (should be 8 rows)
SELECT
  week_number,
  rir_value,
  rpe_value,
  CASE
    WHEN week_number = 8 THEN '(DELOAD)'
    ELSE ''
  END AS note
FROM program_progression_config
WHERE program_template_id = (
  SELECT id FROM program_templates WHERE name = '3 Day Full Body Beginner'
)
ORDER BY week_number;

-- Check 3: Workout days (should be 3 rows)
SELECT day_number, day_name FROM program_template_days
WHERE program_template_id = (
  SELECT id FROM program_templates WHERE name = '3 Day Full Body Beginner'
)
ORDER BY day_number;

-- Check 4: Total exercises (should be 18: 6 per day)
SELECT
  ptd.day_number,
  ptd.day_name,
  COUNT(*) AS exercise_count
FROM program_template_days ptd
JOIN program_template_exercises pte ON pte.template_day_id = ptd.id
WHERE ptd.program_template_id = (
  SELECT id FROM program_templates WHERE name = '3 Day Full Body Beginner'
)
GROUP BY ptd.day_number, ptd.day_name
ORDER BY ptd.day_number;
