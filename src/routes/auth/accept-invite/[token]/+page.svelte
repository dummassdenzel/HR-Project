<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let pending = $state(false);

	const redirectTo = data.token ? `/auth/accept-invite/${data.token}` : '/auth/accept-invite';
	const signInUrl = `/auth/signin?redirect=${encodeURIComponent(redirectTo)}`;
	const signUpUrl = `/auth/signup?redirect=${encodeURIComponent(redirectTo)}`;

	function formatRole(role: string): string {
		return role === 'manager' ? 'Manager' : 'Employee';
	}

	function formatExpiry(expiresAt: string | null): string {
		if (!expiresAt) return '';
		return new Date(expiresAt).toLocaleDateString(undefined, {
			dateStyle: 'medium'
		});
	}

	const isInvalid = data.token && !data.preview;
	const isExpired = data.preview?.status === 'expired';
	const canAccept = data.preview?.status === 'pending';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<Card class="w-full max-w-md p-8">
		{#if isInvalid}
			<div class="mb-4 rounded-md bg-red-50 p-4">
				<h3 class="text-sm font-medium text-red-800">Invalid invitation link</h3>
				<p class="mt-1 text-sm text-red-700">
					This invitation link is invalid or has been removed. Please use the link from your invitation email.
				</p>
			</div>
			<a href="/auth/signin" class="text-sm text-primary hover:underline">Go to sign in</a>
		{:else if isExpired}
			<div class="mb-4 rounded-md bg-amber-50 p-4">
				<h3 class="text-sm font-medium text-amber-800">Invitation expired</h3>
				<p class="mt-1 text-sm text-amber-700">
					This invitation to join <strong>{data.preview?.organization_name}</strong> expired
					{#if data.preview?.expires_at}
						on {formatExpiry(data.preview.expires_at)}.
					{:else}
						.
					{/if}
					Ask your organization to send a new invitation.
				</p>
			</div>
			<a href="/auth/signin" class="text-sm text-primary hover:underline">Go to sign in</a>
		{:else}
			<div class="mb-8">
				<h1 class="text-2xl font-bold tracking-tight text-gray-900">Accept invitation</h1>
				{#if data.preview}
					<p class="mt-2 text-sm text-gray-600">
						You've been invited to join <strong>{data.preview.organization_name}</strong> as
						<strong>{formatRole(data.preview.role)}</strong>. Sign in or create an account, then accept below.
					</p>
				{:else}
					<p class="mt-2 text-sm text-gray-600">
						Sign in or create an account, then accept the invitation.
					</p>
				{/if}
			</div>

			{#if form?.error}
				<div class="mb-4 rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">{form.error}</h3>
						</div>
					</div>
				</div>
			{/if}

			{#if data.user != null}
				<form
					method="POST"
					use:enhance={() => {
						pending = true;
						return async ({ update }) => {
							await update();
							pending = false;
						};
					}}
				>
					<Button
						type="submit"
						class="w-full"
						variant="default"
						disabled={pending || !canAccept}
					>
						{pending ? 'Accepting...' : 'Accept invitation'}
					</Button>
				</form>
			{:else}
				<div class="space-y-4">
					<p class="text-sm text-gray-600">Sign in or create an account to accept this invitation.</p>
					<div class="flex flex-col gap-3">
						<a
							href={signInUrl}
							class="inline-flex justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
						>
							Sign in
						</a>
						<a
							href={signUpUrl}
							class="inline-flex justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground"
						>
							Create account
						</a>
					</div>
				</div>
			{/if}
		{/if}
	</Card>
</div>
