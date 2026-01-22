import type { RequestEvent } from '@sveltejs/kit';
import { requireUserWithRole } from '$lib/auth/guards';

/**
 * Member layout - Employee role only
 * Requires employee role
 */
export async function load(event: RequestEvent) {
	const user = requireUserWithRole(event, 'employee');
	return {
		user
	};
}

