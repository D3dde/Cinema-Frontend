<script lang="ts">
  import { app } from "$lib/state.svelte";
  import { ToggleGroup } from "bits-ui";
  import { cn } from "$lib/utils";
  import { addDaysISO, todayISO } from "$lib/format";
  import SwitchRow from "./SwitchRow.svelte";
  import Button from "./ui/Button.svelte";
  import Input from "./ui/Input.svelte";
  import CinemaLogo from "./CinemaLogo.svelte";
  import HallLogo from "./HallLogo.svelte";
  import { HALL_LOGOS } from "$lib/brands";
  import { ChevronDown, RotateCcw, SlidersHorizontal, Star } from "@lucide/svelte";

  /** Filters start collapsed on mobile and are always expanded on desktop. */
  let open = $state(false);

  const HALLS = ["IMAX", "ENERGIA", "ISENSE", "XL", "SCREENX", "LUXE"];

  /** Upper horizon for the "Tutto" preset: covers every published presale. */
  const ALL_DAYS = 180;

  type RangeKind = "today" | "tomorrow" | "weekend" | "week" | "all";

  function rangeFor(kind: RangeKind): { from: string; to: string } {
    const today = todayISO();
    if (kind === "today") return { from: today, to: today };
    if (kind === "tomorrow") {
      const t = addDaysISO(today, 1);
      return { from: t, to: t };
    }
    if (kind === "week") return { from: today, to: addDaysISO(today, 6) };
    if (kind === "all") return { from: today, to: addDaysISO(today, ALL_DAYS) };
    const d = new Date(today + "T12:00:00");
    const untilFri = (5 - d.getDay() + 7) % 7;
    const fri = addDaysISO(today, untilFri);
    return { from: fri, to: addDaysISO(fri, 2) };
  }

  function setRange(kind: RangeKind) {
    const { from, to } = rangeFor(kind);
    app.filters.from = from;
    app.filters.to = to;
  }

  function isRange(kind: RangeKind): boolean {
    const { from, to } = rangeFor(kind);
    return app.filters.from === from && app.filters.to === to;
  }

  const quickBtn =
    "h-8 rounded-lg px-2.5 text-xs font-medium transition-colors cursor-pointer hover:bg-black/5 dark:hover:bg-white/10";
  const quickBtnOn = "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900";
  const toggleOn =
    "data-[state=on]:border-black/30 data-[state=on]:bg-black/[0.08] dark:data-[state=on]:border-white/30 dark:data-[state=on]:bg-white/15";
</script>

<div class="rounded-xl border border-black/10 bg-white p-3 dark:border-white/10 dark:bg-white/[0.03]">
  <button
    type="button"
    class="flex w-full items-center justify-between text-sm font-semibold lg:hidden"
    aria-expanded={open}
    onclick={() => (open = !open)}
  >
    <span class="flex items-center gap-2">
      <SlidersHorizontal size={16} />
      Filtri
    </span>
    <ChevronDown size={16} class={cn("transition-transform", open && "rotate-180")} />
  </button>

  <div class={cn("flex-col gap-3 pt-3 lg:pt-0", open ? "flex" : "hidden lg:flex")}>
    <!-- Row 1: date range -->
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40"
      >Periodo</span
    >
    <div class="flex items-center gap-0.5 rounded-lg bg-black/[0.04] p-0.5 dark:bg-white/5">
      {#each [["today", "Oggi"], ["tomorrow", "Domani"], ["weekend", "Weekend"], ["week", "7 giorni"], ["all", "Tutto"]] as [kind, label] (kind)}
        <button
          class={cn(quickBtn, isRange(kind as RangeKind) && quickBtnOn)}
          onclick={() => setRange(kind as RangeKind)}
          title={kind === "all" ? "Tutti gli spettacoli in prevendita" : undefined}
        >
          {label}
        </button>
      {/each}
    </div>
    <div class="flex items-center gap-1.5">
      <Input
        type="date"
        class="h-8 w-auto text-xs"
        bind:value={app.filters.from}
        aria-label="Data inizio"
      />
      <span class="text-xs text-black/40 dark:text-white/40">→</span>
      <Input
        type="date"
        class="h-8 w-auto text-xs"
        bind:value={app.filters.to}
        aria-label="Data fine"
      />
    </div>
    <Button variant="ghost" size="sm" class="ml-auto" onclick={() => app.resetFilters()}>
      <RotateCcw size={14} />
      Reset
    </Button>
  </div>

  <!-- Row 2: cinemas -->
  <div class="flex flex-wrap items-center gap-2">
    <span class="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40"
      >Cinema</span
    >
    {#each app.cinemas as cinema (cinema.id)}
      <div class="flex items-center">
        <button
          type="button"
          title={cinema.name}
          aria-label={cinema.name}
          onclick={() => app.toggleCinema(cinema.id)}
          class={cn(
            "flex h-9 cursor-pointer items-center gap-2 rounded-l-lg border px-2.5 transition-colors",
            app.isCinemaActive(cinema.id)
              ? "border-black/25 bg-black/[0.05] text-current dark:border-white/25 dark:bg-white/10"
              : "border-black/10 opacity-50 dark:border-white/10",
          )}
        >
          <CinemaLogo cinemaId={cinema.id} height={18} />
        </button>
        <button
          type="button"
          title="Preferito"
          onclick={() => app.toggleFavorite(cinema.id)}
          class={cn(
            "flex h-9 cursor-pointer items-center rounded-r-lg border border-l-0 px-2 transition-colors",
            app.isCinemaActive(cinema.id)
              ? "border-black/25 bg-black/[0.05] dark:border-white/25 dark:bg-white/10"
              : "border-black/10 dark:border-white/10",
          )}
        >
          <Star
            size={13}
            class={cn(
              app.isFavorite(cinema.id)
                ? "fill-amber-400 text-amber-400"
                : "text-black/30 dark:text-white/30",
            )}
          />
        </button>
      </div>
    {/each}
  </div>

  <!-- Row 3: halls + version -->
  <div class="flex flex-wrap items-center gap-x-4 gap-y-2">
    <span class="text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40"
      >Sale speciali</span
    >
    <ToggleGroup.Root
      type="multiple"
      value={app.filters.halls}
      onValueChange={(v) => (app.filters.halls = v)}
      class="flex flex-wrap gap-1"
    >
      {#each HALLS as hall (hall)}
        <ToggleGroup.Item
          value={hall}
          title={hall === "ENERGIA" ? "Energia" : hall}
          aria-label={hall === "ENERGIA" ? "Energia" : hall}
          class={cn(
            "flex cursor-pointer items-center rounded-md border border-black/10 px-2 py-1 text-[11px] font-semibold uppercase text-black/70 transition-colors dark:border-white/10 dark:text-white/70",
            toggleOn,
          )}
        >
          {#if HALL_LOGOS[hall]}
            <HallLogo {hall} label={hall === "ENERGIA" ? "Energia" : hall} height={hall === "IMAX" ? 12 : 15} />
          {:else}
            {hall}
          {/if}
        </ToggleGroup.Item>
      {/each}
    </ToggleGroup.Root>

    <span class="ml-1 text-xs font-semibold uppercase tracking-wide text-black/40 dark:text-white/40"
      >Formato</span
    >
    <ToggleGroup.Root
      type="single"
      value={app.filters.version || "all"}
      onValueChange={(v) => (app.filters.version = v === "all" || !v ? "" : v)}
      class="flex gap-1"
    >
      {#each ["all", "2D", "3D"] as v (v)}
        <ToggleGroup.Item
          value={v}
          class={cn(
            "cursor-pointer rounded-md border border-black/10 px-2 py-1 text-[11px] font-semibold uppercase text-black/70 transition-colors dark:border-white/10 dark:text-white/70",
            toggleOn,
          )}
        >
          {v === "all" ? "Tutti" : v}
        </ToggleGroup.Item>
      {/each}
    </ToggleGroup.Root>
  </div>

  <!-- Row 4: switches -->
  <div class="flex flex-wrap items-center gap-x-5 gap-y-2">
    <SwitchRow
      label="Lingua originale"
      checked={app.filters.ov}
      onchange={(v) => (app.filters.ov = v)}
    />
    <SwitchRow
      label="Sottotitolati"
      checked={app.filters.subtitled}
      onchange={(v) => (app.filters.subtitled = v)}
    />
    <SwitchRow
      label="Nascondi già iniziati"
      checked={app.filters.hidePastToday}
      onchange={(v) => (app.filters.hidePastToday = v)}
    />
    <SwitchRow
      label="Solo cinema preferiti"
      checked={app.favoritesOnly}
      onchange={(v) => (app.favoritesOnly = v)}
    />
    </div>
  </div>
</div>
