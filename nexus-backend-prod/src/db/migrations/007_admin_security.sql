-- Migration 007: Admin Security (Allowlist, MFA, Audit Log)
-- Created: 2024-02-28
-- Purpose: Implement admin authentication with MFA and security logging

-- 1. Admin Allowlist Table
CREATE TABLE IF NOT EXISTS admin_allowlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    wallet_address VARCHAR(255) NOT NULL, -- Increased from 42 to support long addresses
    role VARCHAR(20) NOT NULL DEFAULT 'ADMIN' CHECK (role IN ('ADMIN', 'SUPER_ADMIN')),
    is_active BOOLEAN NOT NULL DEFAULT true,
    mfa_secret VARCHAR(255), -- TOTP secret (base32 encoded)
    mfa_enabled BOOLEAN NOT NULL DEFAULT false,
    added_by UUID REFERENCES users(id), -- Admin who added this user
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_login_at TIMESTAMPTZ,
    notes TEXT,
    UNIQUE(user_id),
    UNIQUE(wallet_address)
);

-- Index for fast lookups
CREATE INDEX idx_admin_allowlist_user_id ON admin_allowlist(user_id) WHERE is_active = true;
CREATE INDEX idx_admin_allowlist_wallet ON admin_allowlist(wallet_address) WHERE is_active = true;

-- 2. Security Audit Log
CREATE TABLE IF NOT EXISTS security_audit_log (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE SET NULL,
    event_type VARCHAR(50) NOT NULL, -- ADMIN_ACCESS_DENIED, MFA_FAILED, SENSITIVE_OPERATION_AUTHORIZED, etc.
    ip_address INET,
    user_agent TEXT,
    details JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for security monitoring queries
CREATE INDEX idx_security_audit_user ON security_audit_log(user_id, created_at DESC);
CREATE INDEX idx_security_audit_event ON security_audit_log(event_type, created_at DESC);
CREATE INDEX idx_security_audit_created ON security_audit_log(created_at DESC);

-- 3. Insert default super admin (REPLACE WITH YOUR WALLET)
-- This should be updated with the actual admin wallet address
INSERT INTO admin_allowlist (user_id, wallet_address, role, is_active, notes)
SELECT 
    u.id,
    u.wallet_address,
    'SUPER_ADMIN',
    true,
    'Initial super admin - created during migration 007'
FROM users u
WHERE u.role = 'ADMIN'
LIMIT 1
ON CONFLICT (user_id) DO NOTHING;

-- 4. Add admin_allowlist check function
CREATE OR REPLACE FUNCTION is_admin_authorized(p_user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM admin_allowlist 
        WHERE user_id = p_user_id 
        AND is_active = true 
        AND role IN ('ADMIN', 'SUPER_ADMIN')
    );
END;
$$ LANGUAGE plpgsql STABLE;

-- 5. Add security audit helper function
CREATE OR REPLACE FUNCTION log_security_event(
    p_user_id UUID,
    p_event_type VARCHAR(50),
    p_ip_address INET,
    p_user_agent TEXT,
    p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID AS $$
BEGIN
    INSERT INTO security_audit_log (user_id, event_type, ip_address, user_agent, details)
    VALUES (p_user_id, p_event_type, p_ip_address, p_user_agent, p_details);
END;
$$ LANGUAGE plpgsql;

-- 6. Add MFA setup tracking
ALTER TABLE admin_allowlist 
ADD COLUMN IF NOT EXISTS mfa_setup_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS mfa_backup_codes TEXT[]; -- Array of backup codes

COMMENT ON TABLE admin_allowlist IS 'Admin users authorized to access admin panel with MFA support';
COMMENT ON TABLE security_audit_log IS 'Security events audit trail for compliance and monitoring';
COMMENT ON COLUMN admin_allowlist.mfa_secret IS 'Base32 encoded TOTP secret for Google Authenticator';
COMMENT ON COLUMN admin_allowlist.mfa_backup_codes IS 'One-time use backup codes for MFA recovery';

-- Done
SELECT 'Migration 007 complete: Admin security tables created' AS status;
