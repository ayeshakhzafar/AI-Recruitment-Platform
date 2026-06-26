-- =============================================================================
-- Recruto — fake / demo seed data (MySQL 8+)
-- Run after the app has created tables (or run main.py once), then:
--   mysql -u USER -p DATABASE < migrations/004_seed_fake_demo_data.sql
--
-- All primary keys use prefix `seed_` so you can remove demo data with:
--   DELETE FROM results WHERE result_id LIKE 'seed_%';
--   DELETE FROM sessions WHERE session_id LIKE 'seed_%';
--   DELETE FROM coding_submissions WHERE submission_id LIKE 'seed_%';
--   DELETE FROM interview_sessions WHERE session_id LIKE 'seed_int_%';
--   DELETE FROM assessments WHERE assessment_id LIKE 'seed_%';
--   DELETE FROM coding_challenges WHERE challenge_id LIKE 'seed_%';
--   DELETE FROM job_postings WHERE job_id LIKE 'seed_%';
--   DELETE FROM cv_candidates WHERE candidate_id LIKE 'seed_%';
-- =============================================================================

SET NAMES utf8mb4;
START TRANSACTION;

-- ---------------------------------------------------------------------------
-- Job posting (optional — CV module can reference job_id)
-- ---------------------------------------------------------------------------
INSERT INTO job_postings (
  job_id, title, description, required_skills, experience_level,
  location, salary_range, posted_at, posted_by, status
) VALUES (
  'seed_job_001',
  'Junior Backend Engineer',
  'Build APIs with Python and work with PostgreSQL.',
  '["Python","SQL","REST"]',
  'Entry',
  'Remote',
  '$60k–$75k',
  NOW(),
  'hr@demo.local',
  'active'
) ON DUPLICATE KEY UPDATE title = VALUES(title);

-- ---------------------------------------------------------------------------
-- Coding challenge + submissions (HR “coding” / candidate-stages)
-- ---------------------------------------------------------------------------
INSERT INTO coding_challenges (
  challenge_id, title, description, difficulty, language,
  starter_code, test_cases, constraints, examples, hints,
  role, created_at, created_by, is_active
) VALUES (
  'seed_challenge_001',
  'Two Sum',
  'Given an array of integers, return indices of two numbers that add up to target.',
  'easy',
  'python',
  'def two_sum(nums, target):\n    pass\n',
  '[]',
  NULL,
  NULL,
  NULL,
  'Software Engineer',
  NOW(),
  'seed',
  TRUE
) ON DUPLICATE KEY UPDATE title = VALUES(title);

INSERT INTO coding_submissions (
  submission_id, challenge_id, candidate_email, code, language,
  test_results, evaluation, score, submitted_at, assessment_id,
  result_id, score_breakdown, session_id, role, status
) VALUES (
  'seed_csub_001',
  'seed_challenge_001',
  'seed.alice@example.com',
  'def two_sum(nums, target):\n    return [0,1]\n',
  'python',
  '{"passed": 5, "failed": 0}',
  'Looks fine for demo.',
  82,
  DATE_SUB(NOW(), INTERVAL 3 DAY),
  NULL,
  NULL,
  NULL,
  NULL,
  'Software Engineer',
  'submitted'
),
(
  'seed_csub_002',
  'seed_challenge_001',
  'seed.bob@example.com',
  'print("demo")',
  'python',
  '{"passed": 2, "failed": 3}',
  'Incomplete.',
  45,
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  NULL,
  NULL,
  NULL,
  NULL,
  'Software Engineer',
  'submitted'
) ON DUPLICATE KEY UPDATE score = VALUES(score);

-- ---------------------------------------------------------------------------
-- Published assessment (HR dashboard — send / list assessments)
-- ---------------------------------------------------------------------------
INSERT INTO assessments (
  assessment_id, role, difficulty, questions,
  duration_minutes, status, created_at, num_questions,
  is_adaptive, include_coding, assessment_type
) VALUES (
  'seed_asm_001',
  'Software Engineer',
  'medium',
  '[{"question_id":"seed_q_1","question":"What is the primary purpose of version control (e.g. Git)?","options":[{"label":"A","text":"To compile code faster"},{"label":"B","text":"To track changes and collaborate on source code"},{"label":"C","text":"To replace unit tests"},{"label":"D","text":"To deploy to production only"}],"correct_answer":"B","difficulty":"easy","role":"Software Engineer"},{"question_id":"seed_q_2","question":"Which HTTP status code means \"resource not found\"?","options":[{"label":"A","text":"200"},{"label":"B","text":"301"},{"label":"C","text":"404"},{"label":"D","text":"500"}],"correct_answer":"C","difficulty":"easy","role":"Software Engineer"},{"question_id":"seed_q_3","question":"In relational databases, what does ACID refer to?","options":[{"label":"A","text":"A UI design pattern"},{"label":"B","text":"Properties for reliable transactions"},{"label":"C","text":"A caching algorithm only"},{"label":"D","text":"A network protocol"}],"correct_answer":"B","difficulty":"medium","role":"Software Engineer"}]',
  30,
  'published',
  NOW(),
  3,
  FALSE,
  FALSE,
  'standard'
) ON DUPLICATE KEY UPDATE status = VALUES(status), role = VALUES(role), questions = VALUES(questions), num_questions = VALUES(num_questions);

-- ---------------------------------------------------------------------------
-- CV candidates — mix of statuses (pipeline + approved list)
-- skills must be valid JSON (app uses json.loads on read)
-- ---------------------------------------------------------------------------
INSERT INTO cv_candidates (
  candidate_id, email, name, phone, role, skills,
  experience, education, status, skill_match_percentage,
  job_id, created_at, updated_at
) VALUES
(
  'seed_cv_001',
  'seed.alice@example.com',
  'Alice Demo',
  '+10000000001',
  'Software Engineer',
  '["Python","Django","PostgreSQL","Docker"]',
  '2 years backend',
  'BSc CS',
  'approved_for_assessment',
  88.0,
  'seed_job_001',
  DATE_SUB(NOW(), INTERVAL 10 DAY),
  NOW()
),
(
  'seed_cv_002',
  'seed.bob@example.com',
  'Bob Demo',
  '+10000000002',
  'Software Engineer',
  '["Java","Spring","MySQL"]',
  '3 years',
  'BSc SE',
  'approved_for_assessment',
  72.0,
  'seed_job_001',
  DATE_SUB(NOW(), INTERVAL 8 DAY),
  NOW()
),
(
  'seed_cv_003',
  'seed.carol@example.com',
  'Carol Demo',
  '+10000000003',
  'Data Analyst',
  '["SQL","Python","Tableau"]',
  '1 year',
  'BBA',
  'pending',
  55.0,
  'seed_job_001',
  DATE_SUB(NOW(), INTERVAL 5 DAY),
  NOW()
),
(
  'seed_cv_004',
  'seed.dan@example.com',
  'Dan Demo',
  '+10000000004',
  'DevOps Engineer',
  '["Linux","Kubernetes","AWS"]',
  '4 years',
  'MSc',
  'processed',
  91.0,
  NULL,
  DATE_SUB(NOW(), INTERVAL 3 DAY),
  NOW()
),
(
  'seed_cv_005',
  'seed.eve@example.com',
  'Eve Demo',
  '+10000000005',
  'Software Engineer',
  '["JavaScript","React","Node"]',
  '2 years',
  'BSc',
  'pending',
  48.0,
  NULL,
  DATE_SUB(NOW(), INTERVAL 1 DAY),
  NOW()
)
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  status = VALUES(status),
  skill_match_percentage = VALUES(skill_match_percentage),
  skills = VALUES(skills);

-- ---------------------------------------------------------------------------
-- MCQ sessions + results (dashboard charts + /api/results + candidate-stages)
-- ---------------------------------------------------------------------------
INSERT INTO sessions (
  session_id, assessment_id, candidate_email, role,
  start_time, end_time, time_remaining, answers, violations, status, metadata
) VALUES
(
  'seed_sess_001',
  'seed_asm_001',
  'seed.alice@example.com',
  'Software Engineer',
  DATE_SUB(NOW(), INTERVAL 6 DAY),
  DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 25 MINUTE,
  0,
  '[]',
  '[]',
  'completed',
  NULL
),
(
  'seed_sess_002',
  'seed_asm_001',
  'seed.bob@example.com',
  'Software Engineer',
  DATE_SUB(NOW(), INTERVAL 4 DAY),
  DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 28 MINUTE,
  0,
  '[]',
  '[]',
  'completed',
  NULL
),
(
  'seed_sess_003',
  'seed_asm_001',
  'seed.carol@example.com',
  'Data Analyst',
  DATE_SUB(NOW(), INTERVAL 2 DAY),
  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 30 MINUTE,
  0,
  '[]',
  '[]',
  'completed',
  NULL
)
ON DUPLICATE KEY UPDATE status = VALUES(status);

INSERT INTO results (
  result_id, session_id, assessment_id, candidate_email, role, difficulty,
  total_questions, correct_answers, wrong_answers, unanswered,
  score_percentage, start_time, end_time, total_time_taken,
  question_results, violations, status, grade
) VALUES
(
  'seed_res_001',
  'seed_sess_001',
  'seed_asm_001',
  'seed.alice@example.com',
  'Software Engineer',
  'medium',
  10, 8, 2, 0,
  80.0,
  DATE_SUB(NOW(), INTERVAL 6 DAY),
  DATE_SUB(NOW(), INTERVAL 6 DAY) + INTERVAL 25 MINUTE,
  1500,
  '[]',
  '[]',
  'completed',
  'B'
),
(
  'seed_res_002',
  'seed_sess_002',
  'seed_asm_001',
  'seed.bob@example.com',
  'Software Engineer',
  'medium',
  10, 6, 3, 1,
  60.0,
  DATE_SUB(NOW(), INTERVAL 4 DAY),
  DATE_SUB(NOW(), INTERVAL 4 DAY) + INTERVAL 28 MINUTE,
  1680,
  '[]',
  '[]',
  'completed',
  'C'
),
(
  'seed_res_003',
  'seed_sess_003',
  'seed_asm_001',
  'seed.carol@example.com',
  'Data Analyst',
  'medium',
  10, 4, 5, 1,
  40.0,
  DATE_SUB(NOW(), INTERVAL 2 DAY),
  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 30 MINUTE,
  1800,
  '[]',
  '[]',
  'completed',
  'D'
)
ON DUPLICATE KEY UPDATE score_percentage = VALUES(score_percentage);

-- ---------------------------------------------------------------------------
-- AI interview sessions (pipeline + interviews HR view)
-- ---------------------------------------------------------------------------
INSERT INTO interview_sessions (
  session_id, candidate_email, candidate_name, job_role, status,
  face_verified, start_time, end_time, overall_score,
  questions_json, responses_json, emotion_data_json, hr_report_json
) VALUES
(
  'seed_int_001',
  'seed.alice@example.com',
  'Alice Demo',
  'Software Engineer',
  'completed',
  1,
  DATE_SUB(NOW(), INTERVAL 2 DAY),
  DATE_SUB(NOW(), INTERVAL 2 DAY) + INTERVAL 18 MINUTE,
  81.0,
  '[]',
  '[]',
  NULL,
  NULL
),
(
  'seed_int_002',
  'seed.bob@example.com',
  'Bob Demo',
  'Software Engineer',
  'in_progress',
  0,
  DATE_SUB(NOW(), INTERVAL 1 HOUR),
  NULL,
  NULL,
  '[]',
  '[]',
  NULL,
  NULL
),
(
  'seed_int_003',
  'seed.dan@example.com',
  'Dan Demo',
  'DevOps Engineer',
  'completed',
  1,
  DATE_SUB(NOW(), INTERVAL 12 DAY),
  DATE_SUB(NOW(), INTERVAL 12 DAY) + INTERVAL 22 MINUTE,
  76.5,
  '[]',
  '[]',
  NULL,
  NULL
)
ON DUPLICATE KEY UPDATE
  status = VALUES(status),
  overall_score = VALUES(overall_score),
  end_time = VALUES(end_time);

COMMIT;

-- Verify (optional):
-- SELECT COUNT(*) FROM cv_candidates WHERE candidate_id LIKE 'seed_%';
-- SELECT COUNT(*) FROM results WHERE result_id LIKE 'seed_%';
