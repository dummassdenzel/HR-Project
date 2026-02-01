import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

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

		// Sign in successful — redirect to requested path or dashboard
		const redirectTo = event.url.searchParams.get('redirect');
		const path = redirectTo?.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '/app/dashboard';
		throw redirect(303, path);
	}
};

