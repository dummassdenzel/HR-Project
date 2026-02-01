<script lang="ts">
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let resendPending = $state<string | null>(null);
	let revokePending = $state<string | null>(null);
	let revokeConfirmedId = $state<string | null>(null);

	function formatDate(dateString: string | null): string {
		if (!dateString) return 'N/A';
		return new Date(dateString).toLocaleDateString(undefined, { dateStyle: 'medium' });
	}

	function relativeExpiry(expiresAt: string | null): string {
		if (!expiresAt) return 'N/A';
		const exp = new Date(expiresAt);
		const now = new Date();
		const ms = exp.getTime() - now.getTime();
		if (ms <= 0) return 'Expired';
		const days = Math.floor(ms / (24 * 60 * 60 * 1000));
		const hours = Math.floor((ms % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000));
		if (days > 0) return `Expires in ${days} day${days === 1 ? '' : 's'}`;
		if (hours > 0) return `Expires in ${hours} hour${hours === 1 ? '' : 's'}`;
		const minutes = Math.floor((ms % (60 * 60 * 1000)) / (60 * 1000));
		if (minutes > 0) return `Expires in ${minutes} minute${minutes === 1 ? '' : 's'}`;
		return 'Expires soon';
	}

	function formatRole(role: string): string {
		return role === 'manager' ? 'Manager' : 'Employee';
	}

	type FormResult = ActionData | null;
	const formResult = $derived($page.form as FormResult);
</script>

<div class="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-6xl">
		<div class="mb-6 flex items-center justify-between">
			<div>
				<a href="/app/admin" class="text-sm text-primary hover:underline">&larr; Back to admin</a>
			</div>
		</div>

		<div class="mb-8 flex items-center justify-between">
			<div>
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">Pending invitations</h1>
				<p class="mt-2 text-sm text-gray-600">
					Manage invitations that have not yet been accepted. Resend the email or revoke the invite.
				</p>
			</div>
			<a
				href="/app/admin/employees/invite"
				class="inline-flex items-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
			>
				Invite employee
			</a>
		</div>

		{#if formResult?.error}
			<div class="mb-4 rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">{formResult.error}</h3>
					</div>
				</div>
			</div>
		{/if}

		{#if formResult?.success}
			<div class="mb-4 rounded-md bg-green-50 p-4">
				<div class="flex">
					<div class="ml-3">
						<h3 class="text-sm font-medium text-green-800">{formResult.message}</h3>
					</div>
				</div>
			</div>
		{/if}

		{#if data.invites.length === 0}
			<Card class="p-8 text-center">
				<p class="text-gray-500">No pending invitations.</p>
				<a href="/app/admin/employees/invite" class="mt-4 inline-block text-sm text-primary hover:underline">
					Invite an employee
				</a>
			</Card>
		{:else}
			<Card class="overflow-hidden">
				<table class="min-w-full divide-y divide-gray-200">
					<thead class="bg-gray-50">
						<tr>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Email
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Role
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Expires
							</th>
							<th scope="col" class="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
								Invited
							</th>
							<th scope="col" class="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
								Actions
							</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-gray-200 bg-white">
						{#each data.invites as invite}
							<tr class="hover:bg-gray-50">
								<td class="whitespace-nowrap px-6 py-4">
									<div class="text-sm font-medium text-gray-900">{invite.email}</div>
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
									{formatRole(invite.role)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500" title={formatDate(invite.expires_at)}>
									{relativeExpiry(invite.expires_at)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-sm text-gray-500">
									{formatDate(invite.created_at)}
								</td>
								<td class="whitespace-nowrap px-6 py-4 text-right text-sm">
									<div class="flex justify-end gap-2">
										<form
											method="POST"
											action="?/resend"
											use:enhance={() => {
												resendPending = invite.id;
												return async ({ update }) => {
													await update();
													resendPending = null;
												};
											}}
										>
											<input type="hidden" name="inviteId" value={invite.id} />
											<Button
												type="submit"
												variant="outline"
												size="sm"
												disabled={resendPending !== null || revokePending !== null}
											>
												{resendPending === invite.id ? 'Sending...' : 'Resend'}
											</Button>
										</form>
										<form
											method="POST"
											action="?/revoke"
											onsubmit={(e) => {
												if (revokeConfirmedId !== invite.id) {
													e.preventDefault();
													if (confirm('Are you sure you want to revoke this invite?')) {
														revokeConfirmedId = invite.id;
														(e.target as HTMLFormElement).requestSubmit();
													}
												}
											}}
											use:enhance={() => {
												revokePending = invite.id;
												return async ({ update, result }) => {
													await update();
													revokePending = null;
													revokeConfirmedId = null;
													if (result.type === 'success') await invalidateAll();
												};
											}}
										>
											<input type="hidden" name="inviteId" value={invite.id} />
											<Button
												type="submit"
												variant="destructive"
												size="sm"
												disabled={resendPending !== null || revokePending !== null}
											>
												{revokePending === invite.id ? 'Revoking...' : 'Revoke'}
											</Button>
										</form>
									</div>
								</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</Card>
		{/if}
	</div>
</div>
