import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireUserWithRole } from '$lib/auth/guards';
import type { Database } from '$lib/database.types';

type Employee201Profile = Database['public']['Tables']['employee_201_profiles']['Row'];

/**
 * Employee 201 Profile Page
 * 
 * Load function:
 * - Gets existing profile or creates draft if none exists
 * 
 * Actions:
 * - save: Updates profile (only if draft or rejected)
 * - submit: Changes status to 'submitted' (only if draft or rejected)
 */

export const load: PageServerLoad = async (event) => {
	const user = requireUserWithRole(event, 'employee');

	if (!user.current_organization_id) {
		throw fail(400, { error: 'Organization required' });
	}

	// Get existing profile or create draft
	const { data: profile, error } = await event.locals.supabase
		.from('employee_201_profiles')
		.select('*')
		.eq('user_id', user.id)
		.eq('organization_id', user.current_organization_id)
		.maybeSingle();

	if (error) {
		console.error('[employee/201] Error fetching profile:', error);
		throw fail(500, { error: 'Failed to load profile' });
	}

	// If no profile exists, create a draft
	if (!profile) {
		const { data: newProfile, error: createError } = await event.locals.supabase
			.from('employee_201_profiles')
			.insert({
				user_id: user.id,
				organization_id: user.current_organization_id,
				legal_full_name: '',
				status: 'draft'
			})
			.select()
			.single();

		if (createError) {
			console.error('[employee/201] Error creating draft profile:', createError);
			throw fail(500, { error: 'Failed to create profile' });
		}

		return {
			profile: newProfile
		};
	}

	return {
		profile
	};
};

export const actions: Actions = {
	/**
	 * Save profile (create or update)
	 * Only allowed if status is 'draft' or 'rejected'
	 */
	save: async (event) => {
		const user = requireUserWithRole(event, 'employee');

		if (!user.current_organization_id) {
			return fail(400, { error: 'Organization required' });
		}

		const formData = await event.request.formData();
		const legalFullName = formData.get('legal_full_name')?.toString()?.trim();
		const address = formData.get('address')?.toString()?.trim() || null;
		const birthdate = formData.get('birthdate')?.toString() || null;
		const contactNumber = formData.get('contact_number')?.toString()?.trim() || null;
		const emergencyContactName = formData.get('emergency_contact_name')?.toString()?.trim() || null;
		const emergencyContactNumber = formData.get('emergency_contact_number')?.toString()?.trim() || null;

		// Validation
		if (!legalFullName || legalFullName.length === 0) {
			return fail(400, {
				error: 'Legal full name is required',
				legal_full_name: legalFullName || '',
				address,
				birthdate,
				contact_number: contactNumber,
				emergency_contact_name: emergencyContactName,
				emergency_contact_number: emergencyContactNumber
			});
		}

		// Get existing profile to check status
		const { data: existingProfile, error: fetchError } = await event.locals.supabase
			.from('employee_201_profiles')
			.select('status')
			.eq('user_id', user.id)
			.eq('organization_id', user.current_organization_id)
			.maybeSingle();

		if (fetchError) {
			console.error('[employee/201] Error fetching profile for save:', fetchError);
			return fail(500, { error: 'Failed to load profile' });
		}

		// Check if profile can be edited (must be draft or rejected)
		if (existingProfile && !['draft', 'rejected'].includes(existingProfile.status)) {
			return fail(403, {
				error: 'Profile cannot be edited after submission',
				legal_full_name: legalFullName,
				address,
				birthdate,
				contact_number: contactNumber,
				emergency_contact_name: emergencyContactName,
				emergency_contact_number: emergencyContactNumber
			});
		}

		// Update or insert profile
		const updateData = {
			legal_full_name: legalFullName,
			address,
			birthdate: birthdate || null,
			contact_number: contactNumber,
			emergency_contact_name: emergencyContactName,
			emergency_contact_number: emergencyContactNumber
		};

		const { data: profile, error: saveError } = await event.locals.supabase
			.from('employee_201_profiles')
			.upsert(
				{
					user_id: user.id,
					organization_id: user.current_organization_id,
					...updateData,
					status: 'draft' // Ensure status stays draft on save
				},
				{
					onConflict: 'user_id,organization_id'
				}
			)
			.select()
			.single();

		if (saveError) {
			console.error('[employee/201] Error saving profile:', saveError);
			return fail(500, {
				error: 'Failed to save profile',
				legal_full_name: legalFullName,
				address,
				birthdate,
				contact_number: contactNumber,
				emergency_contact_name: emergencyContactName,
				emergency_contact_number: emergencyContactNumber
			});
		}

		return {
			success: true,
			message: 'Profile saved successfully',
			profile
		};
	},

	/**
	 * Submit profile (change status to 'submitted')
	 * Only allowed if status is 'draft' or 'rejected'
	 */
	submit: async (event) => {
		const user = requireUserWithRole(event, 'employee');

		if (!user.current_organization_id) {
			return fail(400, { error: 'Organization required' });
		}

		// Get existing profile
		const { data: profile, error: fetchError } = await event.locals.supabase
			.from('employee_201_profiles')
			.select('*')
			.eq('user_id', user.id)
			.eq('organization_id', user.current_organization_id)
			.maybeSingle();

		if (fetchError) {
			console.error('[employee/201] Error fetching profile for submit:', fetchError);
			return fail(500, { error: 'Failed to load profile' });
		}

		if (!profile) {
			return fail(404, { error: 'Profile not found. Please save your profile first.' });
		}

		// Check if profile can be submitted (must be draft or rejected)
		if (!['draft', 'rejected'].includes(profile.status)) {
			return fail(403, { error: 'Profile cannot be submitted' });
		}

		// Validate required fields
		if (!profile.legal_full_name || profile.legal_full_name.trim().length === 0) {
			return fail(400, { error: 'Please complete all required fields before submitting' });
		}

		// Update status to submitted
		const { data: updatedProfile, error: submitError } = await event.locals.supabase
			.from('employee_201_profiles')
			.update({
				status: 'submitted',
				submitted_at: new Date().toISOString()
			})
			.eq('id', profile.id)
			.select()
			.single();

		if (submitError) {
			console.error('[employee/201] Error submitting profile:', submitError);
			return fail(500, { error: 'Failed to submit profile' });
		}

		return {
			success: true,
			message: 'Profile submitted successfully',
			profile: updatedProfile
		};
	}
};

