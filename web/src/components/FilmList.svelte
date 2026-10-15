<script lang="ts">
  import type { FilmSummary } from "$lib/types";
  import { app } from "$lib/state.svelte";
  import { cn } from "$lib/utils";
  import { formatDuration } from "$lib/format";
  import HallBadge from "./HallBadge.svelte";
  import CinemaLogo from "./CinemaLogo.svelte";
  import Skeleton from "./ui/Skeleton.svelte";

  interface Props {
    films: FilmSummary[];
    selectedKey: string;
    loading?: boolean;
    onselect: (filmKey: string) => void;
  }

  let { films, selectedKey, loading = false, onselect }: Props = $props();

  function cinemaDots(film: FilmSummary) {
    return film.cinemas
      .map((id) => app.cinemas.find((c) => c.id === id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c));
  }
</script>

{#if loading}
  <div class="space-y-2 p-2">
    {#each Array(8) as _}
      <div class="flex gap-3 rounded-xl border border-black/5 p-2 dark:border-white/5">
        <Skeleton class="h-[72px] w-12" />
        <div class="flex-1 space-y-2 py-1">
          <Skeleton class="h-4 w-3/4" />
          <Skeleton class="h-3 w-1/2" />
        </div>
      </div>
    {/each}
  </div>
{:else if films.length === 0}
  <div class="p-6 text-center text-sm text-black/50 dark:text-white/50">
    Nessun film trovato.
  </div>
{:else}
  <div class="space-y-1.5 p-1.5">
    {#each films as film (film.filmKey)}
      <button
        type="button"
        onclick={() => onselect(film.filmKey)}
        class={cn(
          "flex w-full cursor-pointer gap-3 rounded-xl border p-2 text-left transition-colors",
          film.filmKey === selectedKey
            ? "border-black/25 bg-black/[0.05] dark:border-white/25 dark:bg-white/10"
            : "border-transparent hover:bg-black/[0.04] dark:hover:bg-white/[0.06]",
        )}
      >
        <div
          class="h-[72px] w-12 shrink-0 overflow-hidden rounded-lg bg-black/10 dark:bg-white/10"
        >
          {#if film.poster}
            <img src={film.poster} alt="" loading="lazy" class="h-full w-full object-cover" />
          {/if}
        </div>
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-semibold">{film.title}</p>
          {#if film.originalTitle && film.originalTitle !== film.title}
            <p class="truncate text-xs text-black/45 dark:text-white/45">{film.originalTitle}</p>
          {/if}
          <div class="mt-1.5 flex flex-wrap items-center gap-1.5">
            {#each cinemaDots(film) as c (c.id)}
              <CinemaLogo cinemaId={c.id} height={13} />
            {/each}
            {#if film.duration}
              <span class="text-[11px] text-black/45 dark:text-white/45">
                {formatDuration(film.duration)}
              </span>
            {/if}
          </div>
          <div class="mt-1.5 flex flex-wrap items-center gap-1">
            {#each film.halls.slice(0, 3) as hall (hall)}
              <HallBadge {hall} />
            {/each}
            <span class="ml-auto text-[11px] text-black/40 dark:text-white/40"
              >{film.showtimeCount} orari</span
            >
          </div>
        </div>
      </button>
    {/each}
  </div>
{/if}
