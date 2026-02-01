<script lang="ts">
	import Card from '$lib/components/ui/card.svelte';
</script>

<div class="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12 sm:px-6 lg:px-8">
	<Card class="w-full max-w-md p-8">
		<div class="mb-4 rounded-md bg-red-50 p-4">
			<h3 class="text-sm font-medium text-red-800">Invalid link</h3>
			<p class="mt-1 text-sm text-red-700">
				This invitation link is invalid or missing. Please use the full link from your invitation email.
			</p>
		</div>
		<a href="/auth/signin" class="text-sm text-primary hover:underline">Go to sign in</a>
	</Card>
</div>
