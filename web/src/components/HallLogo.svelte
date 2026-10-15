<script lang="ts">
  import { HALL_LOGOS } from "$lib/brands";
  import { cn } from "$lib/utils";

  interface Props {
    hall: string;
    label: string;
    class?: string;
    /** rendered logo height in px */
    height?: number;
  }

  let { hall, label, class: className, height = 12 }: Props = $props();
  const logo = $derived(HALL_LOGOS[hall]);
  const width = $derived(logo?.aspect ? Math.round(height * logo.aspect) : undefined);
</script>

{#if logo}
  {#if logo.mask}
    <span
      role="img"
      aria-label={label}
      title={label}
      class={cn("shrink-0", className)}
      style="display:inline-block;height:{height}px;width:{width}px;background-color:currentColor;-webkit-mask:url({logo.src}) center/contain no-repeat;mask:url({logo.src}) center/contain no-repeat"
    ></span>
  {:else}
    <img
      src={logo.src}
      alt={label}
      title={label}
      style="height:{height}px"
      class={cn("w-auto shrink-0 object-contain", className)}
    />
  {/if}
{/if}
