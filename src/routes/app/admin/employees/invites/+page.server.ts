import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireUserWithRole } from '$lib/auth/guards';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

/**
 * HR Invites List Page
 *
 * List pending invites (not accepted, not expired).
 * Resend: trigger edge function with user's session token.
 * Revoke: delete invite (RLS must allow HR to delete their org's invites).
 */
export const load: PageServerLoad = async (event) => {
	const user = requireUserWithRole(event, 'hr_admin');

	if (!user.current_organization_id) {
		return { invites: [] };
	}

	const now = new Date().toISOString();

	// Pending: not accepted, not expired. RLS restricts to HR's org.
	const { data: invites, error } = await event.locals.supabase
		.from('employee_invites')
		.select(`
			id,
			email,
			role,
			expires_at,
			created_at,
			organizations ( name )
		`)
		.eq('organization_id', user.current_organization_id)
		.is('accepted_at', null)
		.gt('expires_at', now)
		.order('created_at', { ascending: false });

	if (error) {
		console.error('[admin/employees/invites] Error fetching invites:', error);
		return { invites: [] };
	}

	return { invites: invites ?? [] };
};

async function sendInviteEmail(
	supabase: ReturnType<typeof import('$lib/supabase/server').createSupabaseServerClient>,
	functionUrl: string,
	inviteId: string
): Promise<{ ok: boolean }> {
	const {
		data: { session }
	} = await supabase.auth.getSession();
	if (!session?.access_token) return { ok: false };
	const res = await fetch(functionUrl, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: `Bearer ${session.access_token}`
		},
		body: JSON.stringify({ inviteId })
	});
	return { ok: res.ok };
}

export const actions: Actions = {
	resend: async (event) => {
		const user = requireUserWithRole(event, 'hr_admin');

		const formData = await event.request.formData();
		const inviteId = formData.get('inviteId')?.toString()?.trim();

		if (!inviteId) {
			return fail(400, { error: 'Invalid request', resendId: null, revokeId: null });
		}

		// Verify invite belongs to org (RLS will block if not)
		const { data: invite, error: fetchError } = await event.locals.supabase
			.from('employee_invites')
			.select('id, accepted_at, expires_at')
			.eq('id', inviteId)
			.eq('organization_id', user.current_organization_id!)
			.is('accepted_at', null)
			.maybeSingle();

		if (fetchError || !invite) {
			return fail(404, { error: 'Invite not found or already used', resendId: null, revokeId: null });
		}

		const now = new Date().toISOString();
		if (invite.expires_at < now) {
			return fail(400, { error: 'Invite has expired', resendId: null, revokeId: null });
		}

		const functionUrl = `${PUBLIC_SUPABASE_URL}/functions/v1/send-invite-email`;
		const { ok } = await sendInviteEmail(event.locals.supabase, functionUrl, inviteId);

		if (!ok) {
			return fail(500, {
				error: 'Failed to send email. The invite is still valid; you can try again.',
				resendId: null,
				revokeId: null
			});
		}

		return {
			success: true,
			message: 'Invitation email sent again.',
			resendId: null,
			revokeId: null
		};
	},

	revoke: async (event) => {
		const user = requireUserWithRole(event, 'hr_admin');

		const formData = await event.request.formData();
		const inviteId = formData.get('inviteId')?.toString()?.trim();

		if (!inviteId) {
			return fail(400, { error: 'Invalid request', resendId: null, revokeId: null });
		}

		// Delete invite; RLS must allow HR to delete their org's invites
		const { error: deleteError } = await event.locals.supabase
			.from('employee_invites')
			.delete()
			.eq('id', inviteId)
			.eq('organization_id', user.current_organization_id!)
			.is('accepted_at', null);

		if (deleteError) {
			console.error('[admin/employees/invites] Revoke error:', deleteError);
			// If RLS blocks delete, suggest adding revoke_employee_invite RPC
			return fail(403, {
				error: 'Unable to revoke this invite. You may need a revoke_employee_invite RPC or RLS policy.',
				resendId: null,
				revokeId: null
			});
		}

		return {
			success: true,
			message: 'Invitation revoked.',
			resendId: null,
			revokeId: null
		};
	}
};
