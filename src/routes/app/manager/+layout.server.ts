import type { RequestEvent } from '@sveltejs/kit';
import { requireUserWithRole } from '$lib/auth/guards';

/**
 * Manager layout - Manager role only
 * Requires manager role
 */
export async function load(event: RequestEvent) {
	const user = requireUserWithRole(event, 'manager');
	return {
		user
	};
}

