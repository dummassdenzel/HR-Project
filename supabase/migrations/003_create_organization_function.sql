-- Atomic organization creation function
-- Creates organization and membership in a single transaction
-- This ensures atomicity and removes rollback logic from application code

CREATE OR REPLACE FUNCTION create_organization(org_name TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    org_id UUID;
    org_slug TEXT;
    base_slug TEXT;
    counter INTEGER := 1;
    user_uuid UUID;
BEGIN
    -- Get current user ID
    user_uuid := auth.uid();
    
    IF user_uuid IS NULL THEN
        RAISE EXCEPTION 'User must be authenticated';
    END IF;

    -- Generate base slug from name
    base_slug := LOWER(REGEXP_REPLACE(org_name, '[^a-z0-9\s-]', '', 'g'));
    base_slug := REGEXP_REPLACE(base_slug, '\s+', '-', 'g');
    base_slug := REGEXP_REPLACE(base_slug, '-+', '-', 'g');
    base_slug := TRIM(BOTH '-' FROM base_slug);
    base_slug := SUBSTRING(base_slug FROM 1 FOR 50);

    -- Ensure slug is not empty
    IF base_slug = '' THEN
        RAISE EXCEPTION 'Organization name must contain at least one letter or number';
    END IF;

    -- Find unique slug
    org_slug := base_slug;
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = org_slug) LOOP
        org_slug := base_slug || '-' || counter;
        counter := counter + 1;
        
        IF counter > 100 THEN
            RAISE EXCEPTION 'Unable to generate unique organization identifier';
        END IF;
    END LOOP;

    -- Validate name length
    IF LENGTH(org_name) < 2 OR LENGTH(org_name) > 100 THEN
        RAISE EXCEPTION 'Organization name must be between 2 and 100 characters';
    END IF;

    -- Insert organization
    INSERT INTO organizations (name, slug)
    VALUES (org_name, org_slug)
    RETURNING id INTO org_id;

    -- Insert membership (creator is hr_admin)
    INSERT INTO organization_memberships (user_id, organization_id, role)
    VALUES (user_uuid, org_id, 'hr_admin');

    RETURN org_id;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION create_organization(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION create_organization(TEXT) IS 'Atomically creates organization and membership. Returns organization ID.';

