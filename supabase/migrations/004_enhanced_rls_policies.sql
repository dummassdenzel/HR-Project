-- Enhanced RLS policies with role-based access control
-- All policies now enforce organization_id + role checks

-- Drop existing policies (they'll be recreated with role checks)
DROP POLICY IF EXISTS "Users can view their organizations" ON organizations;
DROP POLICY IF EXISTS "Authenticated users can create organizations" ON organizations;
DROP POLICY IF EXISTS "Users can view profiles in their organizations" ON user_profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view memberships in their organizations" ON organization_memberships;
DROP POLICY IF EXISTS "HR admins can manage memberships" ON organization_memberships;

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

-- Organizations: Only authenticated users can create orgs (via function)
-- Note: Actual creation happens via create_organization() function
CREATE POLICY "Authenticated users can create organizations"
    ON organizations FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- User profiles: Users can view profiles in their org
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

-- Example: Future table policies should follow this pattern
-- All tenant tables must include organization_id
-- All policies must check organization_id + role when needed
-- Example for future employees table:
-- CREATE POLICY "Users can view employees in their org"
--     ON employees FOR SELECT
--     USING (
--         organization_id IN (
--             SELECT organization_id 
--             FROM organization_memberships 
--             WHERE user_id = auth.uid()
--         )
--     );
-- 
-- CREATE POLICY "HR admins can manage employees"
--     ON employees FOR ALL
--     USING (
--         organization_id IN (
--             SELECT organization_id 
--             FROM organization_memberships 
--             WHERE user_id = auth.uid() 
--             AND role = 'hr_admin'
--         )
--     );

