import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { requireUserWithRole } from '$lib/auth/guards';
import { PUBLIC_SUPABASE_URL } from '$env/static/public';

/**
 * HR Invite Employee Page
 *
 * Create invite via RPC, then trigger edge function to send email
 */
export const load: PageServerLoad = async (event) => {
	requireUserWithRole(event, 'hr_admin');
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const user = requireUserWithRole(event, 'hr_admin');

		const formData = await event.request.formData();
		const email = formData.get('email')?.toString()?.trim()?.toLowerCase();
		const role = (formData.get('role')?.toString() ?? 'employee') as 'employee' | 'manager';

		if (!email) {
			return fail(400, {
				error: 'Email is required',
				email: '',
				role
			});
		}

		const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
		if (!emailRegex.test(email)) {
			return fail(400, {
				error: 'Invalid email format',
				email,
				role
			});
		}

		if (role !== 'employee' && role !== 'manager') {
			return fail(400, {
				error: 'Role must be employee or manager',
				email,
				role: 'employee'
			});
		}

		// Create invite via RPC (SECURITY DEFINER, uses auth.uid() for org)
		const { data: inviteId, error: rpcError } = await (event.locals.supabase.rpc as any)(
			'create_employee_invite',
			{ target_email: email, target_role: role }
		);

		if (rpcError) {
			const msg = rpcError.message ?? 'Failed to create invite';
			// Handle unique constraint (duplicate invite)
			if (msg.includes('unique') || msg.includes('duplicate') || msg.includes('already exists')) {
				return fail(400, {
					error: 'An invite for this email already exists in your organization.',
					email,
					role
				});
			}
			if (msg.includes('Not authorized')) {
				return fail(403, { error: 'Not authorized to create invites', email, role });
			}
			console.error('[admin/employees/invite] RPC error:', rpcError);
			return fail(500, { error: 'Failed to create invite. Please try again.', email, role });
		}

		if (!inviteId) {
			return fail(500, { error: 'Failed to create invite. Please try again.', email, role });
		}

		// Use the HR user's session token so the edge function can trust auth.uid()
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();

		if (!session?.access_token) {
			return fail(401, { error: 'Not authenticated', email, role });
		}

		// Trigger edge function to send invite email (server-to-server with user identity)
		const functionName = 'send-invite-email';
		const functionUrl = `${PUBLIC_SUPABASE_URL}/functions/v1/${functionName}`;
		try {
			const res = await fetch(functionUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					Authorization: `Bearer ${session.access_token}`
				},
				body: JSON.stringify({ inviteId })
			});
			if (!res.ok) {
				const body = await res.text();
				console.error('[admin/employees/invite] Edge function error:', res.status, body);
				// Invite was created; email may still be sent by a retry or manual process
				return {
					success: true,
					message: `Invitation created for ${email}. The invitation email may be delayed; they can contact you for the link if needed.`,
					email: '',
					role: 'employee'
				};
			}
		} catch (err) {
			console.error('[admin/employees/invite] Edge function fetch error:', err);
			// Invite exists; inform user
			return {
				success: true,
				message: `Invitation created for ${email}. If they did not receive the email, you can share the accept-invite link with them.`,
				email: '',
				role: 'employee'
			};
		}

		return {
			success: true,
			message: `Invitation sent to ${email}. They will receive an email with a link to create their account.`,
			email: '',
			role: 'employee'
		};
	}
};
