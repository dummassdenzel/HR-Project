import type { RequestEvent } from '@sveltejs/kit';
import { requireUserWithRole } from '$lib/auth/guards';

/**
 * Admin layout - HR Admin only
 * Requires hr_admin role
 */
export async function load(event: RequestEvent) {
	const user = requireUserWithRole(event, 'hr_admin');
	return {
		user
	};
}

