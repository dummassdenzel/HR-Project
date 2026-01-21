-- Verification queries for schema setup
-- Run these after migrating 001_initial_schema.sql to verify everything works

-- 1. Check tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('organizations', 'user_profiles', 'organization_memberships')
ORDER BY table_name;

-- 2. Check RLS is enabled
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'user_profiles', 'organization_memberships');

-- 3. Check indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'user_profiles', 'organization_memberships')
ORDER BY tablename, indexname;

-- 4. Check enum type exists
SELECT typname 
FROM pg_type 
WHERE typname = 'membership_role';

-- 5. Check policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('organizations', 'user_profiles', 'organization_memberships')
ORDER BY tablename, policyname;

-- 6. Check triggers exist
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
AND event_object_table IN ('organizations', 'user_profiles', 'organization_memberships')
ORDER BY event_object_table, trigger_name;

-- 7. Check functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_schema = 'public' 
AND routine_name IN ('update_updated_at_column', 'handle_new_user', 'get_user_organization', 'user_has_role')
ORDER BY routine_name;

