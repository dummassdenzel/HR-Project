import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { requireUserWithOrg } from '$lib/auth/guards';

/**
 * Sign in action
 * Authenticates user via Supabase Auth
 */
export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();

		// Validation
		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required',
				email
			});
		}

		// Sign in user via Supabase Auth
		const { error } = await event.locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			// Generic error message for security (don't reveal if email exists)
			return fail(401, {
				error: 'Invalid email or password',
				email
			});
		}

		// Sign in successful
		// hooks.server.ts will fetch user + memberships on next request
		// Check if user has organization membership
		// Note: We need to wait for next request for user data to be in locals
		// So we'll check after redirect - the target route will handle it
		throw redirect(303, '/app/dashboard');
	}
};

