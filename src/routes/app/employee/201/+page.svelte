<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import Button from '$lib/components/ui/button.svelte';
	import Input from '$lib/components/ui/input.svelte';
	import Label from '$lib/components/ui/label.svelte';
	import Card from '$lib/components/ui/card.svelte';
	import type { PageData, ActionData } from './$types';
	import type { Database } from '$lib/database.types';

	type Employee201Profile = Database['public']['Tables']['employee_201_profiles']['Row'];

	let { data }: { data: PageData } = $props();
	let savePending = $state(false);
	let submitPending = $state(false);

	// Get form data from action results (SvelteKit 5)
	type FormResult = ActionData & { 
		profile?: Employee201Profile;
	} | null;
	
	let formResult = $derived($page.form as FormResult);

	// Track profile from form actions (overrides load data when action succeeds)
	let formActionProfile = $state<Employee201Profile | null>(null);
	
	// Use form action profile if available, otherwise use load data
	let profile = $derived(formActionProfile ?? data.profile);

	// Update local profile when form actions succeed
	$effect(() => {
		if (formResult?.success && formResult.profile) {
			formActionProfile = formResult.profile;
		}
	});

	// Reset form action profile when data changes (e.g., page navigation)
	$effect(() => {
		// Access data.profile to track it
		data.profile;
		formActionProfile = null;
	});

	// Check if form can be edited
	const canEdit = $derived(['draft', 'rejected'].includes(profile.status));
	const isSubmitted = $derived(['submitted', 'approved'].includes(profile.status));
</script>

<div class="min-h-screen bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<div class="mx-auto max-w-3xl">
		<Card class="p-8">
			<div class="mb-8">
				<h1 class="text-3xl font-bold tracking-tight text-gray-900">Employee 201 File</h1>
				<p class="mt-2 text-sm text-gray-600">
					Please complete your 201 file information. All fields marked with * are required.
				</p>
			</div>

			{#if profile.status === 'draft'}
				<div class="mb-4 rounded-md bg-yellow-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-yellow-800">Draft</h3>
							<p class="mt-1 text-sm text-yellow-700">Your profile is saved as a draft. Complete all fields and submit when ready.</p>
						</div>
					</div>
				</div>
			{/if}

			{#if profile.status === 'submitted'}
				<div class="mb-4 rounded-md bg-blue-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-blue-800">Submitted</h3>
							<p class="mt-1 text-sm text-blue-700">
								Your profile was submitted on {profile.submitted_at ? new Date(profile.submitted_at).toLocaleDateString() : 'N/A'}. 
								It is now under review and cannot be edited.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if profile.status === 'approved'}
				<div class="mb-4 rounded-md bg-green-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-green-800">Approved</h3>
							<p class="mt-1 text-sm text-green-700">
								Your profile has been approved on {profile.approved_at ? new Date(profile.approved_at).toLocaleDateString() : 'N/A'}.
							</p>
						</div>
					</div>
				</div>
			{/if}

			{#if profile.status === 'rejected'}
				<div class="mb-4 rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">Rejected</h3>
							<p class="mt-1 text-sm text-red-700">Your profile was rejected. Please review and resubmit after making corrections.</p>
						</div>
					</div>
				</div>
			{/if}

			{#if formResult?.error}
				<div class="mb-4 rounded-md bg-red-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-red-800">{formResult.error}</h3>
						</div>
					</div>
				</div>
			{/if}

			{#if formResult?.success && !formResult.error}
				<div class="mb-4 rounded-md bg-green-50 p-4">
					<div class="flex">
						<div class="ml-3">
							<h3 class="text-sm font-medium text-green-800">{formResult.message || 'Operation completed successfully'}</h3>
						</div>
					</div>
				</div>
			{/if}

			<form method="POST" action="?/save" use:enhance={() => {
				savePending = true;
				return async ({ update }) => {
					await update();
					savePending = false;
				};
			}}>
				<div class="space-y-6">
					<!-- Legal Full Name -->
					<div>
						<Label for="legal_full_name">
							Legal Full Name <span class="text-red-500">*</span>
						</Label>
						<Input
							id="legal_full_name"
							name="legal_full_name"
							type="text"
							required
							value={profile.legal_full_name || ''}
							disabled={!canEdit || savePending || submitPending}
							class="mt-1"
							placeholder="Enter your legal full name"
						/>
					</div>

					<!-- Address -->
					<div>
						<Label for="address">Address</Label>
						<Input
							id="address"
							name="address"
							type="text"
							value={profile.address || ''}
							disabled={!canEdit || savePending || submitPending}
							class="mt-1"
							placeholder="Enter your address"
						/>
					</div>

					<!-- Birthdate -->
					<div>
						<Label for="birthdate">Birthdate</Label>
						<Input
							id="birthdate"
							name="birthdate"
							type="date"
							value={profile.birthdate || ''}
							disabled={!canEdit || savePending || submitPending}
							class="mt-1"
						/>
					</div>

					<!-- Contact Number -->
					<div>
						<Label for="contact_number">Contact Number</Label>
						<Input
							id="contact_number"
							name="contact_number"
							type="tel"
							value={profile.contact_number || ''}
							disabled={!canEdit || savePending || submitPending}
							class="mt-1"
							placeholder="Enter your contact number"
						/>
					</div>

					<!-- Emergency Contact Name -->
					<div>
						<Label for="emergency_contact_name">Emergency Contact Name</Label>
						<Input
							id="emergency_contact_name"
							name="emergency_contact_name"
							type="text"
							value={profile.emergency_contact_name || ''}
							disabled={!canEdit || savePending || submitPending}
							class="mt-1"
							placeholder="Enter emergency contact name"
						/>
					</div>

					<!-- Emergency Contact Number -->
					<div>
						<Label for="emergency_contact_number">Emergency Contact Number</Label>
						<Input
							id="emergency_contact_number"
							name="emergency_contact_number"
							type="tel"
							value={profile.emergency_contact_number || ''}
							disabled={!canEdit || savePending || submitPending}
							class="mt-1"
							placeholder="Enter emergency contact number"
						/>
					</div>

					<!-- Action Buttons -->
					<div class="flex gap-4 pt-4">
						<Button
							type="submit"
							variant="default"
							disabled={!canEdit || savePending || submitPending}
						>
							{savePending ? 'Saving...' : 'Save Draft'}
						</Button>
					</div>
				</div>
			</form>

			{#if canEdit}
				<form method="POST" action="?/submit" use:enhance={() => {
					submitPending = true;
					return async ({ update }) => {
						await update();
						submitPending = false;
					};
				}}>
					<div class="mt-4">
						<Button
							type="submit"
							variant="default"
							disabled={savePending || submitPending}
						>
							{submitPending ? 'Submitting...' : 'Submit'}
						</Button>
					</div>
				</form>
			{/if}
		</Card>
	</div>
</div>
