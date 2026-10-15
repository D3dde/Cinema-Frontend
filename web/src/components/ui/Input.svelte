<script lang="ts">
  import { cn } from "$lib/utils";
  import type { HTMLInputAttributes } from "svelte/elements";

  interface Props extends Omit<HTMLInputAttributes, "value"> {
    class?: string;
    value?: string;
  }

  let { class: className, value = $bindable(), ...rest }: Props = $props();
</script>

<input
  bind:value
  class={cn(
    "h-10 w-full rounded-lg border border-black/10 bg-white px-3 text-sm outline-none transition placeholder:text-black/40 focus:border-black/30 focus:ring-2 focus:ring-black/10 dark:border-white/10 dark:bg-white/[0.04] dark:placeholder:text-white/40 dark:focus:border-white/30 dark:focus:ring-white/10",
    className,
  )}
  {...rest}
/>
