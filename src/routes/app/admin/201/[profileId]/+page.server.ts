import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireUserWithRole } from '$lib/auth/guards';
import type { Database } from '$lib/database.types';

type Employee201Profile = Database['public']['Tables']['employee_201_profiles']['Row'];

/**
 * HR Admin 201 Review Page
 *
 * View submitted profile details and approve/reject
 * Route uses profile id (row primary key) as the true identifier
 * RLS ensures only profiles in the admin's organization are accessible
 */
export const load: PageServerLoad = async (event) => {
	const user = requireUserWithRole(event, 'hr_admin');
	const { profileId } = event.params;

	if (!user.current_organization_id) {
		throw fail(400, { error: 'Organization required' });
	}

	if (!profileId) {
		throw error(400, 'Profile ID required');
	}

	// Get the profile by id; RLS policy restricts to admin's org
	const { data: profile, error: fetchError } = await event.locals.supabase
		.from('employee_201_profiles')
		.select('*')
		.eq('id', profileId)
		.maybeSingle();

	if (fetchError) {
		console.error('[admin/201/[profileId]] Error fetching profile:', fetchError);
		throw fail(500, { error: 'Failed to load profile' });
	}

	if (!profile) {
		throw error(404, 'Profile not found');
	}

	// RLS ensures we only see org profiles; double-check for safety
	if (profile.organization_id !== user.current_organization_id) {
		throw error(404, 'Profile not found');
	}

	// Only allow viewing submitted, approved, or rejected profiles
	if (!['submitted', 'approved', 'rejected'].includes(profile.status)) {
		throw error(403, 'Profile not available for review');
	}

	return {
		profile
	};
};

export const actions: Actions = {
	approve: async (event) => {
		const user = requireUserWithRole(event, 'hr_admin');
		const { profileId } = event.params;

		if (!user.current_organization_id) {
			return fail(400, { error: 'Organization required' });
		}

		if (!profileId) {
			return fail(400, { error: 'Profile ID required' });
		}

		const { data: profile, error: fetchError } = await event.locals.supabase
			.from('employee_201_profiles')
			.select('id, status, organization_id')
			.eq('id', profileId)
			.maybeSingle();

		if (fetchError) {
			console.error('[admin/201/[profileId]] Error fetching profile for approve:', fetchError);
			return fail(500, { error: 'Failed to load profile' });
		}

		if (!profile) {
			return fail(404, { error: 'Profile not found' });
		}

		if (profile.organization_id !== user.current_organization_id) {
			return fail(404, { error: 'Profile not found' });
		}

		if (profile.status !== 'submitted') {
			return fail(400, { error: 'Only submitted profiles can be approved' });
		}

		const { data: updatedProfile, error: updateError } = await event.locals.supabase
			.from('employee_201_profiles')
			.update({
				status: 'approved',
				approved_at: new Date().toISOString()
			})
			.eq('id', profile.id)
			.eq('status', 'submitted')
			.select()
			.single();

		if (updateError) {
			console.error('[admin/201/[profileId]] Error approving profile:', updateError);
			return fail(500, { error: 'Failed to approve profile' });
		}

		return {
			success: true,
			message: 'Profile approved successfully',
			profile: updatedProfile
		};
	},

	reject: async (event) => {
		const user = requireUserWithRole(event, 'hr_admin');
		const { profileId } = event.params;

		if (!user.current_organization_id) {
			return fail(400, { error: 'Organization required' });
		}

		if (!profileId) {
			return fail(400, { error: 'Profile ID required' });
		}

		const { data: profile, error: fetchError } = await event.locals.supabase
			.from('employee_201_profiles')
			.select('id, status, organization_id')
			.eq('id', profileId)
			.maybeSingle();

		if (fetchError) {
			console.error('[admin/201/[profileId]] Error fetching profile for reject:', fetchError);
			return fail(500, { error: 'Failed to load profile' });
		}

		if (!profile) {
			return fail(404, { error: 'Profile not found' });
		}

		if (profile.organization_id !== user.current_organization_id) {
			return fail(404, { error: 'Profile not found' });
		}

		if (profile.status !== 'submitted') {
			return fail(400, { error: 'Only submitted profiles can be rejected' });
		}

		const { data: updatedProfile, error: updateError } = await event.locals.supabase
			.from('employee_201_profiles')
			.update({
				status: 'rejected'
			})
			.eq('id', profile.id)
			.eq('status', 'submitted')
			.select()
			.single();

		if (updateError) {
			console.error('[admin/201/[profileId]] Error rejecting profile:', updateError);
			return fail(500, { error: 'Failed to reject profile' });
		}

		return {
			success: true,
			message: 'Profile rejected. Employee can make corrections and resubmit.',
			profile: updatedProfile
		};
	}
};
