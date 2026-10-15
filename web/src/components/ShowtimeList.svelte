<script lang="ts">
  import type { Showtime } from "$lib/types";
  import { dayLabel, formatDate, isPast } from "$lib/format";
  import ShowtimeRow from "./ShowtimeRow.svelte";
  import CinemaBadge from "./CinemaBadge.svelte";

  interface Props {
    showtimes: Showtime[];
  }

  let { showtimes }: Props = $props();

  const groups = $derived.by(() => {
    const map = new Map<string, Showtime[]>();
    for (const st of showtimes) {
      const arr = map.get(st.date);
      if (arr) arr.push(st);
      else map.set(st.date, [st]);
    }
    return [...map.entries()].map(([date, items]) => ({
      date,
      items,
      cinemas: [...new Set(items.map((i) => i.cinemaId))],
    }));
  });

  const nextId = $derived(showtimes.find((s) => !isPast(s))?.id ?? "");
</script>

{#if showtimes.length === 0}
  <div
    class="rounded-xl border border-dashed border-black/15 p-10 text-center text-sm text-black/50 dark:border-white/15 dark:text-white/50"
  >
    Nessuno spettacolo con i filtri selezionati.
  </div>
{:else}
  <div class="space-y-8">
    {#each groups as group (group.date)}
      <section>
        <header
          class="sticky top-0 z-10 -mx-2 mb-3 flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg bg-white/90 px-2 py-2 backdrop-blur dark:bg-[#0a0a0a]/90"
        >
          <h3 class="text-base font-semibold">
            <span>{dayLabel(group.date)}</span>
            <span class="ml-2 text-sm font-normal capitalize text-black/50 dark:text-white/50">
              {formatDate(group.date)}
            </span>
          </h3>
          <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs">
            {#each group.cinemas as cinemaId (cinemaId)}
              <CinemaBadge {cinemaId} />
            {/each}
          </div>
          <span class="ml-auto text-xs text-black/40 dark:text-white/40">
            {group.items.length} spettacol{group.items.length === 1 ? "o" : "i"}
          </span>
        </header>

        <div class="space-y-2">
          {#each group.items as st (st.id)}
            <ShowtimeRow showtime={st} isNext={st.id === nextId} isPast={isPast(st)} />
          {/each}
        </div>
      </section>
    {/each}
  </div>
{/if}
