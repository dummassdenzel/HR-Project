-- HR SaaS Platform - Initial Schema (Phase 1)
-- Multi-tenant, role-based access control foundation

-- Enable UUID extension (Supabase has this by default, but explicit for clarity)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- CORE TABLES
-- ============================================================================

-- Organizations (tenants)
CREATE TABLE organizations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- User profiles (extends Supabase Auth users)
-- Note: Supabase Auth handles users table, this stores additional profile data
CREATE TABLE user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    avatar_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Organization memberships (user-org-role relationship)
CREATE TYPE membership_role AS ENUM ('employee', 'manager', 'hr_admin');

CREATE TABLE organization_memberships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
    role membership_role NOT NULL DEFAULT 'employee',
    department TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    -- Prevent duplicate memberships
    UNIQUE(user_id, organization_id)
);

-- ============================================================================
-- INDEXES (Performance optimization)
-- ============================================================================

-- Organizations
CREATE INDEX idx_organizations_slug ON organizations(slug);

-- User profiles
CREATE INDEX idx_user_profiles_id ON user_profiles(id);

-- Organization memberships (critical for RLS and queries)
CREATE INDEX idx_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX idx_memberships_org_id ON organization_memberships(organization_id);
CREATE INDEX idx_memberships_user_org ON organization_memberships(user_id, organization_id);
CREATE INDEX idx_memberships_role ON organization_memberships(role);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE organization_memberships ENABLE ROW LEVEL SECURITY;

-- Organizations: Users can only see orgs they belong to
CREATE POLICY "Users can view their organizations"
    ON organizations FOR SELECT
    USING (
        id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Organizations: Only authenticated users can create orgs (will refine in app logic)
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- User profiles: Users can view their own profile and profiles in their org
CREATE POLICY "Users can view profiles in their organizations"
    ON user_profiles FOR SELECT
    USING (
        id = auth.uid() OR
        id IN (
            SELECT user_id 
            FROM organization_memberships 
            WHERE organization_id IN (
                SELECT organization_id 
                FROM organization_memberships 
                WHERE user_id = auth.uid()
            )
        )
    );

-- User profiles: Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON user_profiles FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid());

-- User profiles: Auto-create profile on user signup (handled by trigger)
CREATE POLICY "Users can insert their own profile"
    ON user_profiles FOR INSERT
    WITH CHECK (id = auth.uid());

-- Organization memberships: Users can view memberships in their orgs
CREATE POLICY "Users can view memberships in their organizations"
    ON organization_memberships FOR SELECT
    USING (
        organization_id IN (
            SELECT organization_id 
            FROM organization_memberships 
            WHERE user_id = auth.uid()
        )
    );

-- Organization memberships: HR admins can manage memberships in their org
CREATE POLICY "HR admins can manage memberships"
    ON organization_memberships FOR ALL
    USING (
        EXISTS (
            SELECT 1 
            FROM organization_memberships 
            WHERE user_id = auth.uid() 
            AND organization_id = organization_memberships.organization_id
            AND role = 'hr_admin'
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 
            FROM organization_memberships 
            WHERE user_id = auth.uid() 
            AND organization_id = organization_memberships.organization_id
            AND role = 'hr_admin'
        )
    );

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON organizations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON user_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at
    BEFORE UPDATE ON organization_memberships
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO user_profiles (id, full_name)
    VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile when user signs up
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- HELPER FUNCTIONS (For application use)
-- ============================================================================

-- Function to get user's current organization (for single-org users, Phase 1)
-- Returns the first org the user belongs to (can be enhanced later)
CREATE OR REPLACE FUNCTION get_user_organization(user_uuid UUID)
RETURNS UUID AS $$
    SELECT organization_id 
    FROM organization_memberships 
    WHERE user_id = user_uuid 
    LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- Function to check if user has role in organization
CREATE OR REPLACE FUNCTION user_has_role(
    user_uuid UUID,
    org_uuid UUID,
    required_role membership_role
)
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 
        FROM organization_memberships 
        WHERE user_id = user_uuid 
        AND organization_id = org_uuid 
        AND role = required_role
    );
$$ LANGUAGE sql SECURITY DEFINER;

-- ============================================================================
-- COMMENTS (Documentation)
-- ============================================================================

COMMENT ON TABLE organizations IS 'Multi-tenant organizations (companies)';
COMMENT ON TABLE user_profiles IS 'Extended user profile data (Supabase Auth handles core user)';
COMMENT ON TABLE organization_memberships IS 'Many-to-many relationship: users belong to orgs with roles';
COMMENT ON COLUMN organizations.slug IS 'URL-friendly identifier (e.g., "acme-corp")';
COMMENT ON COLUMN organization_memberships.role IS 'User role within the organization';
COMMENT ON COLUMN organization_memberships.department IS 'Optional department assignment (future use)';

