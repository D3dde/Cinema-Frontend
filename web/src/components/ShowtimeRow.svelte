<script lang="ts">
  import type { Showtime } from "$lib/types";
  import { cn } from "$lib/utils";
  import { languageLabel } from "$lib/format";
  import CinemaBadge from "./CinemaBadge.svelte";
  import HallBadge from "./HallBadge.svelte";
  import Badge from "./ui/Badge.svelte";
  import LinkButton from "./ui/LinkButton.svelte";
  import { Ticket } from "@lucide/svelte";

  interface Props {
    showtime: Showtime;
    isNext?: boolean;
    isPast?: boolean;
  }

  let { showtime, isNext = false, isPast = false }: Props = $props();
</script>

<div
  class={cn(
    "group flex items-stretch gap-3 rounded-xl border p-3 transition-colors",
    isPast
      ? "border-black/5 opacity-45 dark:border-white/5"
      : "border-black/10 hover:bg-black/[0.02] dark:border-white/10 dark:hover:bg-white/[0.04]",
    isNext && "border-black/25 dark:border-white/25",
  )}
>
  <div
    class="flex w-16 shrink-0 flex-col items-center justify-center rounded-lg bg-black/[0.04] py-1 dark:bg-white/5"
  >
    <span class="text-lg font-semibold tabular-nums leading-none">{showtime.time}</span>
  </div>

  <div class="min-w-0 flex-1">
    <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1">
      <CinemaBadge cinemaId={showtime.cinemaId} class="text-sm" />
      {#each showtime.halls as hall (hall)}
        <HallBadge {hall} />
      {/each}
      {#if isNext}
        <Badge class="bg-black/5 text-black/60 ring-black/10 dark:bg-white/10 dark:text-white/60 dark:ring-white/15">Prossimo</Badge>
      {/if}
    </div>
    <div
      class="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-black/50 dark:text-white/50"
    >
      {#if showtime.room}<span>{showtime.room}</span>{/if}
      {#if showtime.version}<span>{showtime.version}</span>{/if}
      {#if showtime.originalVersion}<span>Lingua originale</span>{/if}
      {#if showtime.subtitled}<span>Sottotitolato</span>{/if}
      <span>{languageLabel(showtime.language)}</span>
    </div>
  </div>

  <div class="flex items-center">
    {#if showtime.bookingUrl}
      <LinkButton href={showtime.bookingUrl}>
        <Ticket size={14} />
        Prenota
      </LinkButton>
    {/if}
  </div>
</div>
