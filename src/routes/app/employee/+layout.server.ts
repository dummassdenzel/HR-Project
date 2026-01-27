import type { LayoutServerLoad } from './$types';
import { requireUserWithRole } from '$lib/auth/guards';

/**
 * Employee layout - Employee role only
 * Requires employee role (or higher via hierarchy)
 */
export const load: LayoutServerLoad = (event) => {
	const user = requireUserWithRole(event, 'employee');
	return {
		user
	};
};

