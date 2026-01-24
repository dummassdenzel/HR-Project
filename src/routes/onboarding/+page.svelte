<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();
	let pending = $state(false);
	
	// Get form data from action result (SvelteKit 5)
	let formData = $derived($page.form as { error?: string; name?: string } | null);
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<Card class="w-full max-w-md p-8">
		<div class="mb-8">
			<h2 class="text-3xl font-bold tracking-tight text-gray-900">Create your organization</h2>
			<p class="mt-2 text-sm text-gray-600">
				Welcome, {data.user.full_name || data.user.email}! Let's get started by creating your organization.
			</p>
		</div>

		{#if formData?.error}
			<div class="mb-4 rounded-md bg-red-50 p-4">
				<div class="flex">
					<div class="ml-3">
						<h3 class="text-sm font-medium text-red-800">{formData.error}</h3>
					</div>
				</div>
			</div>
		{/if}

		<form method="POST" use:enhance={() => {
			pending = true;
			return async ({ update }) => {
				await update();
				pending = false;
			};
		}}>
			<div class="space-y-4">
				<div>
					<Label for="name">Organization Name</Label>
					<Input
						id="name"
						name="name"
						type="text"
						autocomplete="organization"
						required
						minlength={2}
						maxlength={100}
						value={formData?.name || ''}
						placeholder="Acme Corporation"
						disabled={pending}
						class="mt-1"
					/>
					<p class="mt-1 text-xs text-gray-500">
						This will be your company's name in the system. You can change it later.
					</p>
				</div>

				<div>
					<Button type="submit" class="w-full" variant="default" disabled={pending}>
						{pending ? 'Creating organization...' : 'Create Organization'}
					</Button>
				</div>
			</div>
		</form>
	</Card>
</div>

