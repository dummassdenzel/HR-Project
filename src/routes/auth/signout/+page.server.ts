import { redirect } from '@sveltejs/kit';
import type { Actions } from './$types';

/**
 * Sign out action
 * Signs out user and clears session
 */
export const actions: Actions = {
	default: async (event) => {
		await event.locals.supabase.auth.signOut();
		throw redirect(303, '/auth/signin');
	}
};

