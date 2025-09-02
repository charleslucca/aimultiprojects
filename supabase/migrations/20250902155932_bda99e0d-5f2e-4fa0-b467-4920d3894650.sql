-- Fix project permissions and created_by fields
-- This migration creates admin permissions for the current user on all existing projects
-- and updates the created_by field to ensure proper access control

DO $$
DECLARE
    current_user_id uuid;
    project_record RECORD;
BEGIN
    -- Get the current authenticated user (this will be the first user in the system)
    -- Since we're running this as a migration, we'll use the first user found
    SELECT id INTO current_user_id FROM auth.users ORDER BY created_at LIMIT 1;
    
    -- If no user found, create a placeholder (this shouldn't happen in production)
    IF current_user_id IS NULL THEN
        RAISE NOTICE 'No users found in auth.users table';
        RETURN;
    END IF;
    
    RAISE NOTICE 'Creating permissions for user: %', current_user_id;
    
    -- Update all projects to have the correct created_by field
    UPDATE projects 
    SET created_by = current_user_id 
    WHERE created_by IS NULL;
    
    -- Create admin permissions for the user on all existing projects
    FOR project_record IN SELECT id FROM projects LOOP
        -- Insert admin permission if it doesn't already exist
        INSERT INTO project_permissions (
            project_id,
            user_id,
            permission_type,
            granted_by,
            is_active,
            granted_at
        ) VALUES (
            project_record.id,
            current_user_id,
            'admin',
            current_user_id,
            true,
            now()
        )
        ON CONFLICT (project_id, user_id, permission_type) DO NOTHING;
        
        RAISE NOTICE 'Created admin permission for project: %', project_record.id;
    END LOOP;
    
    -- Ensure the user has proper permissions in project_permissions table
    RAISE NOTICE 'Migration completed successfully for user: %', current_user_id;
END $$;