import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

/**
 * Sign up action
 * Creates a new user account via Supabase Auth
 */
export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString();
		const password = formData.get('password')?.toString();
		const fullName = formData.get('full_name')?.toString();

		// Validation
		if (!email || !password) {
			return fail(400, {
				error: 'Email and password are required',
				email
			});
		}

		// Email format validation
		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, {
				error: 'Invalid email format',
				email
			});
		}

		// Password strength validation (Phase 1: min 8 chars)
		if (password.length < 8) {
			return fail(400, {
				error: 'Password must be at least 8 characters',
				email
			});
		}

		// Sign up user via Supabase Auth
		const { data, error } = await event.locals.supabase.auth.signUp({
			email,
			password,
			options: {
				data: {
					full_name: fullName || null
				}
			}
		});

		if (error) {
			// Handle specific Supabase errors
			if (error.message.includes('already registered')) {
				return fail(400, {
					error: 'An account with this email already exists',
					email
				});
			}

			return fail(500, {
				error: error.message || 'Failed to create account',
				email
			});
		}

		// Check if email confirmation is required
		if (data.user && !data.session) {
			// Email confirmation required
			return {
				success: true,
				requiresVerification: true,
				message: 'Please check your email to verify your account',
				email
			};
		}

		// User is signed up and session is created
		// hooks.server.ts will fetch user + memberships on next request
		// New users always go to onboarding (no org yet)
		throw redirect(303, '/onboarding');
	}
};

