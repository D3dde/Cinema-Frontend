<script lang="ts">
  import { app } from "$lib/state.svelte";
  import { CINEMA_LOGOS } from "$lib/brands";
  import { cn } from "$lib/utils";

  interface Props {
    cinemaId: string;
    class?: string;
    /** rendered logo height in px */
    height?: number;
  }

  let { cinemaId, class: className, height = 18 }: Props = $props();
  const cinema = $derived(app.cinemas.find((c) => c.id === cinemaId));
  const logo = $derived(CINEMA_LOGOS[cinemaId]);
  const name = $derived(cinema?.name ?? cinemaId);
  const width = $derived(logo?.aspect ? Math.round(height * logo.aspect) : undefined);
</script>

{#if logo}
  {#if logo.mask}
    <span
      role="img"
      aria-label={name}
      title={name}
      class={cn("shrink-0", className)}
      style="display:inline-block;height:{height}px;width:{width}px;background-color:currentColor;-webkit-mask:url({logo.src}) center/contain no-repeat;mask:url({logo.src}) center/contain no-repeat"
    ></span>
  {:else}
    <img
      src={logo.src}
      alt={name}
      title={name}
      style="height:{height}px"
      class={cn("w-auto shrink-0 object-contain", className)}
    />
  {/if}
{:else}
  <span class={cn("whitespace-nowrap font-medium", className)}>{name}</span>
{/if}
