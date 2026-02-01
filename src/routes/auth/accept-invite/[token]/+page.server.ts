import { fail, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireUser } from '$lib/auth/guards';

/**
 * Accept Invite Page — /auth/accept-invite/[token]
 *
 * User lands with token in the path from the email link.
 * Load fetches invite preview (org name, role, status); if already accepted, redirect to dashboard.
 * If not logged in, we show sign in / sign up with redirect back here.
 * If logged in, they can accept; RPC creates membership and marks invite accepted.
 */
export const load: PageServerLoad = async (event) => {
	const token = event.params.token ?? null;
	const user = event.locals.user ?? null;

	if (!token) {
		return { token: null, user, preview: null };
	}

	// Read-only preview (granted to anon + authenticated)
	const { data: previewRow } = await (event.locals.supabase.rpc as any)(
		'preview_employee_invite',
		{ invite_token: token }
	).maybeSingle();

	const preview = previewRow ?? null;

	if (preview?.status === 'accepted') {
		throw redirect(303, '/app/dashboard');
	}

	return { token, user, preview: preview ?? null };
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
				throw redirect(303, '/app/dashboard');
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
