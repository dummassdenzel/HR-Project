<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import type { PageData, ActionData } from './$types';

	let { data, form }: { data: PageData; form: ActionData } = $props();
	let pending = $state(false);

	const redirectTo = data.token
		? `/auth/accept-invite?token=${encodeURIComponent(data.token)}`
		 : '/auth/accept-invite';
	const signInUrl = `/auth/signin?redirect=${encodeURIComponent(redirectTo)}`;
	const signUpUrl = `/auth/signup?redirect=${encodeURIComponent(redirectTo)}`;
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<Card class="w-full max-w-md p-8">
		{#if !data.token}
			<div class="mb-4 rounded-md bg-red-50 p-4">
				<h3 class="text-sm font-medium text-red-800">Invalid link</h3>
				<p class="mt-1 text-sm text-red-700">This invitation link is invalid or missing. Please use the link from your invitation email.</p>
			</div>
			<a href="/auth/signin" class="text-sm text-primary hover:underline">Go to sign in</a>
		{:else}
			<div class="mb-8">
				<h1 class="text-2xl font-bold tracking-tight text-gray-900">Accept invitation</h1>
				<p class="mt-2 text-sm text-gray-600">
					You’ve been invited to join an organization. Sign in or create an account, then accept the invitation.
				</p>
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
				<!-- Logged in: show Accept button -->
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
					<input type="hidden" name="token" value={data.token} />
					<Button type="submit" class="w-full" variant="default" disabled={pending}>
						{pending ? 'Accepting...' : 'Accept invitation'}
					</Button>
				</form>
			{:else}
				<!-- Not logged in: show sign in / sign up -->
				<div class="space-y-4">
					<p class="text-sm text-gray-600">Sign in or create an account to accept this invitation.</p>
					<div class="flex flex-col gap-3">
						<a href={signInUrl} class="inline-flex justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
							Sign in
						</a>
						<a href={signUpUrl} class="inline-flex justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent hover:text-accent-foreground">
							Create account
						</a>
					</div>
				</div>
			{/if}
		{/if}
	</Card>
</div>
