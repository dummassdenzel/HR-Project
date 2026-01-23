<script lang="ts">
	import { cn } from '$lib/utils';
	import type { HTMLAttributes } from 'svelte/elements';
	import type { Snippet } from 'svelte';

	interface CardProps extends HTMLAttributes<HTMLDivElement> {
		class?: string;
		children?: Snippet;
	}

	let {
		class: className = '',
		children,
		...rest
	}: CardProps = $props();
</script>

<div
	class={cn('rounded-lg border bg-card text-card-foreground ', className)}
	{...rest}
>
	{#if children}
		{@render children()}
	{/if}
</div>

