-- Seed Linear Progression Tiers
-- Inserts 5 default progression tiers based on exercise type and weight capacity
-- These values are derived from lib/progression-tiers.ts

-- Insert the 5 default tiers
INSERT INTO linear_progression_tiers (tier_name, min_increment, weekly_increase, adjustment_bounds, max_rep_adjustment, description)
VALUES
  (
    'large_compound',
    5.00,
    0.0250,
    0.1000,
    2,
    'Large compound exercises with high weight potential (squats, deadlifts, leg press). Aggressive progression with larger increments.'
  ),
  (
    'medium_compound',
    2.50,
    0.0250,
    0.1000,
    2,
    'Medium compound exercises (bench press, overhead press, rows). Standard compound progression.'
  ),
  (
    'small_compound',
    2.50,
    0.0200,
    0.1200,
    3,
    'Small compound exercises with limited weight progression (pull-ups, chin-ups, dips). Slower progression with more flexibility.'
  ),
  (
    'large_isolation',
    2.50,
    0.0200,
    0.1500,
    3,
    'Large isolation exercises with significant weight potential (leg extensions, leg curls, RDLs). Moderate progression with flexibility.'
  ),
  (
    'small_isolation',
    1.00,
    0.0150,
    0.2000,
    4,
    'Small isolation exercises with limited weight progression (bicep curls, lateral raises, flys). Conservative progression with high flexibility.'
  )
ON CONFLICT (tier_name) DO NOTHING;

-- Verify the data was inserted
SELECT
  tier_name,
  min_increment,
  weekly_increase * 100 AS weekly_increase_percent,
  adjustment_bounds * 100 AS adjustment_bounds_percent,
  max_rep_adjustment,
  description
FROM linear_progression_tiers
ORDER BY min_increment DESC, weekly_increase DESC;

-- Summary
SELECT
  COUNT(*) AS total_tiers,
  'Progression tiers seeded successfully' AS status
FROM linear_progression_tiers;
