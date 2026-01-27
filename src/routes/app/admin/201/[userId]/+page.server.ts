import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireUserWithRole } from '$lib/auth/guards';
import type { Database } from '$lib/database.types';

type Employee201Profile = Database['public']['Tables']['employee_201_profiles']['Row'];

/**
 * HR Admin 201 Review Page
 * 
 * View submitted profile details and approve/reject
 * RLS ensures only profiles in the admin's organization are accessible
 */
export const load: PageServerLoad = async (event) => {
	const user = requireUserWithRole(event, 'hr_admin');
	const { userId } = event.params;

	if (!user.current_organization_id) {
		throw fail(400, { error: 'Organization required' });
	}

	if (!userId) {
		throw error(400, 'User ID required');
	}

	// Get the profile for the specified user
	// RLS policy handles access control
	const { data: profile, error: fetchError } = await event.locals.supabase
		.from('employee_201_profiles')
		.select('*')
		.eq('user_id', userId)
		.eq('organization_id', user.current_organization_id)
		.maybeSingle();

	if (fetchError) {
		console.error('[admin/201/[userId]] Error fetching profile:', fetchError);
		throw fail(500, { error: 'Failed to load profile' });
	}

	if (!profile) {
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
	/**
	 * Approve the 201 profile
	 */
	approve: async (event) => {
		const user = requireUserWithRole(event, 'hr_admin');
		const { userId } = event.params;

		if (!user.current_organization_id) {
			return fail(400, { error: 'Organization required' });
		}

		if (!userId) {
			return fail(400, { error: 'User ID required' });
		}

		// Get current profile to verify status
		const { data: profile, error: fetchError } = await event.locals.supabase
			.from('employee_201_profiles')
			.select('id, status')
			.eq('user_id', userId)
			.eq('organization_id', user.current_organization_id)
			.maybeSingle();

		if (fetchError) {
			console.error('[admin/201/[userId]] Error fetching profile for approve:', fetchError);
			return fail(500, { error: 'Failed to load profile' });
		}

		if (!profile) {
			return fail(404, { error: 'Profile not found' });
		}

		// Only submitted profiles can be approved
		if (profile.status !== 'submitted') {
			return fail(400, { error: 'Only submitted profiles can be approved' });
		}

		// Update status to approved
		const { data: updatedProfile, error: updateError } = await event.locals.supabase
			.from('employee_201_profiles')
			.update({
				status: 'approved',
				approved_at: new Date().toISOString()
			})
			.eq('id', profile.id)
			.select()
			.single();

		if (updateError) {
			console.error('[admin/201/[userId]] Error approving profile:', updateError);
			return fail(500, { error: 'Failed to approve profile' });
		}

		return {
			success: true,
			message: 'Profile approved successfully',
			profile: updatedProfile
		};
	},

	/**
	 * Reject the 201 profile
	 */
	reject: async (event) => {
		const user = requireUserWithRole(event, 'hr_admin');
		const { userId } = event.params;

		if (!user.current_organization_id) {
			return fail(400, { error: 'Organization required' });
		}

		if (!userId) {
			return fail(400, { error: 'User ID required' });
		}

		// Get current profile to verify status
		const { data: profile, error: fetchError } = await event.locals.supabase
			.from('employee_201_profiles')
			.select('id, status')
			.eq('user_id', userId)
			.eq('organization_id', user.current_organization_id)
			.maybeSingle();

		if (fetchError) {
			console.error('[admin/201/[userId]] Error fetching profile for reject:', fetchError);
			return fail(500, { error: 'Failed to load profile' });
		}

		if (!profile) {
			return fail(404, { error: 'Profile not found' });
		}

		// Only submitted profiles can be rejected
		if (profile.status !== 'submitted') {
			return fail(400, { error: 'Only submitted profiles can be rejected' });
		}

		// Update status to rejected
		const { data: updatedProfile, error: updateError } = await event.locals.supabase
			.from('employee_201_profiles')
			.update({
				status: 'rejected'
			})
			.eq('id', profile.id)
			.select()
			.single();

		if (updateError) {
			console.error('[admin/201/[userId]] Error rejecting profile:', updateError);
			return fail(500, { error: 'Failed to reject profile' });
		}

		return {
			success: true,
			message: 'Profile rejected. Employee can make corrections and resubmit.',
			profile: updatedProfile
		};
	}
};
