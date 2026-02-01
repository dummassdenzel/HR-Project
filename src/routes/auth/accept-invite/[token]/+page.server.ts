import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireUser } from '$lib/auth/guards';

/**
 * Accept Invite Page — /auth/accept-invite/[token]
 *
 * User lands with token in the path from the email link.
 * If not logged in, we show sign in / sign up with redirect back here.
 * If logged in, they can accept; RPC creates membership and marks invite accepted.
 */
export const load: PageServerLoad = async (event) => {
	const token = event.params.token ?? null;
	const user = event.locals.user ?? null;
	return { token, user };
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUser(event);
		const token = event.params.token?.trim();

		if (!token) {
			return fail(400, { error: 'Invalid invitation link. Missing token.' });
		}

		// RPC: accept_employee_invite(invite_token) — SECURITY DEFINER, uses auth.uid()
		const { error: rpcError } = await (event.locals.supabase.rpc as any)('accept_employee_invite', {
			invite_token: token
		});

		if (rpcError) {
			const msg = rpcError.message ?? 'Failed to accept invite';
			if (msg.includes('Invalid invite') || msg.includes('not found')) {
				return fail(404, { error: 'This invitation is invalid or has expired.' });
			}
			if (msg.includes('already used')) {
				return fail(400, { error: 'This invitation has already been used.' });
			}
			if (msg.includes('expired')) {
				return fail(400, { error: 'This invitation has expired.' });
			}
			if (msg.includes('Already a member')) {
				throw redirect(303, '/app/dashboard');
			}
			console.error('[auth/accept-invite] RPC error:', rpcError);
			return fail(500, { error: 'Failed to accept invitation. Please try again.' });
		}

		throw redirect(303, '/app/dashboard');
	}
};
