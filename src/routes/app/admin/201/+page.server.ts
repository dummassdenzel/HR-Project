import { fail } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { requireUserWithRole } from '$lib/auth/guards';
import type { Database } from '$lib/database.types';

type Employee201Profile = Database['public']['Tables']['employee_201_profiles']['Row'];

/**
 * HR Admin 201 List Page
 * 
 * Lists all submitted 201 profiles in the organization for HR review
 * RLS ensures only profiles in the admin's organization are returned
 */
export const load: PageServerLoad = async (event) => {
	const user = requireUserWithRole(event, 'hr_admin');

	if (!user.current_organization_id) {
		throw fail(400, { error: 'Organization required' });
	}

	// Get all submitted profiles in the organization
	// RLS policy "HR admins can view org 201 profiles" handles access control
	const { data: profiles, error } = await event.locals.supabase
		.from('employee_201_profiles')
		.select('id, user_id, legal_full_name, status, submitted_at, approved_at, created_at')
		.eq('organization_id', user.current_organization_id)
		.in('status', ['submitted', 'approved', 'rejected'])
		.order('submitted_at', { ascending: false });

	if (error) {
		console.error('[admin/201] Error fetching profiles:', error);
		throw fail(500, { error: 'Failed to load profiles' });
	}

	return {
		profiles: profiles ?? []
	};
};
