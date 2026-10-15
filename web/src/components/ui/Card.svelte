<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";

  interface Props {
    class?: string;
    children?: Snippet;
  }

  let { class: className, children }: Props = $props();
</script>

<div
  class={cn(
    "rounded-xl border border-black/10 bg-white dark:border-white/10 dark:bg-white/[0.03]",
    className,
  )}
>
  {@render children?.()}
</div>
