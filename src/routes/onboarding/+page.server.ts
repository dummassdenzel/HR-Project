import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { requireUser } from '$lib/auth/guards';

/**
 * Create organization action
 * Uses atomic database function for transaction safety
 */
export const actions: Actions = {
	default: async (event) => {
		// Require authentication
		const user = requireUser(event);

		const formData = await event.request.formData();
		const name = formData.get('name')?.toString()?.trim();

		// Validation
		if (!name) {
			return fail(400, {
				error: 'Organization name is required'
			});
		}

		if (name.length < 2 || name.length > 100) {
			return fail(400, {
				error: 'Organization name must be between 2 and 100 characters'
			});
		}

		// Call atomic database function
		// Type assertion needed until database types are regenerated
		const { data: orgId, error } = await (event.locals.supabase.rpc as any)('create_organization', {
			org_name: name
		});

		if (error) {
			// Database function handles validation and returns clear errors
			return fail(400, {
				error: error.message || 'Failed to create organization'
			});
		}

		if (!orgId) {
			return fail(500, {
				error: 'Failed to create organization'
			});
		}

		// Success - redirect to dashboard
		// hooks.server.ts will refresh user data on next request
		throw redirect(303, '/app/dashboard');
	}
};

