<script lang="ts">
	import { enhance } from '$app/forms';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import type { ActionData } from './$types';

	let { form }: { form: ActionData } = $props();
	let pending = $state(false);
</script>

<div class="min-h-screen bg-gray-50 px-4 py-8 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-md">
		<div class="mb-6">
			<a href="/app/admin" class="text-sm text-primary hover:underline">&larr; Back to admin</a>
		</div>

		<Card class="p-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">Invite employee</h1>
				<p class="mt-2 text-sm text-gray-600">
					Send an invitation to join your organization. They will receive an email with a link to create their account.
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

			{#if form?.success}
				<div class="mb-4 rounded-md bg-green-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-green-800">{form.message}</h3>
						</div>
					</div>
				</div>
			{/if}

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
				<div class="space-y-4">
					<div>
						<Label for="email">Email address</Label>
						<Input
							id="email"
							name="email"
							type="email"
							autocomplete="email"
							required
							value={form?.email ?? ''}
							disabled={pending}
							class="mt-1"
							placeholder="colleague@company.com"
						/>
					</div>

					<div>
						<Label for="role">Role</Label>
						<select
							id="role"
							name="role"
							disabled={pending}
							class="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						>
							<option value="employee" selected={form?.role !== 'manager'}>Employee</option>
							<option value="manager" selected={form?.role === 'manager'}>Manager</option>
						</select>
						<p class="mt-1 text-xs text-gray-500">Employees can submit 201 files. Managers have additional access.</p>
					</div>

					<div class="pt-2">
						<Button type="submit" class="w-full" variant="default" disabled={pending}>
							{pending ? 'Sending...' : 'Send invitation'}
						</Button>
					</div>
				</div>
			</form>
		</Card>
	</div>
</div>
