<script lang="ts">
  import { cn } from "$lib/utils";

  interface Props {
    class?: string;
  }

  let { class: className }: Props = $props();
</script>

<div class={cn("skeleton rounded-lg bg-black/10 dark:bg-white/10", className)}></div>
