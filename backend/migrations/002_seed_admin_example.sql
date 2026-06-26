-- Example: insert one admin after you generate a bcrypt hash for your password.
-- Do NOT commit real passwords. Generate hash with:
--   cd backend
--   python scripts/gen_admin_hash.py "YourStrongPassword"
-- Paste the printed hash into password_hash below.

-- Example row (replace YOUR_BCRYPT_HASH and email as needed):

INSERT INTO app_users (email, password_hash, full_name, role, is_active)
VALUES (
  'admin@yourcompany.com',
  'YOUR_BCRYPT_HASH',
  'Administrator',
  'admin',
  1
);

