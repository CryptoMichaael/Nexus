-- 002_seed.sql: seeds: admin user + reward config + sponsor chain
BEGIN;

-- Create admin user
INSERT INTO users (id, wallet_address, role, created_at)
VALUES
  ('00000000-0000-0000-0000-000000000001','0xadmin000000000000000000000000000000000001','ADMIN', now())
ON CONFLICT (wallet_address) DO NOTHING;

-- seed some users (sponsor chain)
INSERT INTO users (id, wallet_address, sponsor_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000002','0xsponsor1','00000000-0000-0000-0000-000000000001','USER')
ON CONFLICT (wallet_address) DO NOTHING;

INSERT INTO users (id, wallet_address, sponsor_id, role)
VALUES
  ('00000000-0000-0000-0000-000000000003','0xsponsor2','00000000-0000-0000-0000-000000000002','USER')
ON CONFLICT (wallet_address) DO NOTHING;

-- reward levels 1..7
INSERT INTO reward_config (level, percent_bps, active) VALUES
  (1, 1000, true),
  (2, 700, true),
  (3, 500, true),
  (4, 300, true),
  (5, 200, true),
  (6, 150, true),
  (7, 100, true)
ON CONFLICT (level) DO NOTHING;

COMMIT;
