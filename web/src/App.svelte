<script lang="ts">
  import { onMount } from "svelte";
  import { app } from "./lib/state.svelte";
  import { fetchCinemas, fetchFilms, fetchFilmShowtimes } from "./lib/api";
  import { buildIcs } from "./lib/format";
  import { cn, download } from "./lib/utils";
  import FilterBar from "./components/FilterBar.svelte";
  import FilmList from "./components/FilmList.svelte";
  import ShowtimeList from "./components/ShowtimeList.svelte";
  import Input from "./components/ui/Input.svelte";
  import Button from "./components/ui/Button.svelte";
  import {
    Search,
    Moon,
    Sun,
    Film,
    Download,
    TriangleAlert,
    Clapperboard,
    ArrowLeft,
  } from "@lucide/svelte";

  let mounted = $state(false);
  /** Mobile master-detail: false = film list, true = showtimes. */
  let showDetail = $state(false);

  onMount(async () => {
    app.setDark(app.dark);
    try {
      app.cinemas = await fetchCinemas();
    } catch (err) {
      app.error = err instanceof Error ? err.message : String(err);
    }
    mounted = true;
  });

  const effectiveCinemas = $derived.by(() => {
    const active = app.filters.cinemas.length
      ? app.filters.cinemas
      : app.cinemas.map((c) => c.id);
    if (app.favoritesOnly && app.favorites.length) {
      const filtered = active.filter((id) => app.favorites.includes(id));
      return filtered.length ? filtered : active;
    }
    return active;
  });

  let searchDebounced = $state("");
  $effect(() => {
    const q = app.search;
    const t = setTimeout(() => (searchDebounced = q), 250);
    return () => clearTimeout(t);
  });

  const filterSig = $derived(
    JSON.stringify({
      from: app.filters.from,
      to: app.filters.to,
      cinemas: effectiveCinemas,
      halls: [...app.filters.halls].sort(),
      version: app.filters.version,
      ov: app.filters.ov,
      subtitled: app.filters.subtitled,
      hidePastToday: app.filters.hidePastToday,
    }),
  );

  function baseParams() {
    return {
      from: app.filters.from,
      to: app.filters.to,
      cinemas: effectiveCinemas,
      halls: app.filters.halls,
      version: app.filters.version,
      ov: app.filters.ov,
      subtitled: app.filters.subtitled,
      hidePastToday: app.filters.hidePastToday,
    };
  }

  let lastFilmsSig = "";
  $effect(() => {
    if (!mounted) return;
    const sig = filterSig + "|" + searchDebounced;
    if (sig === lastFilmsSig) return;
    lastFilmsSig = sig;
    void loadFilms();
  });

  let lastShowSig = "";
  $effect(() => {
    if (!mounted) return;
    const sig = filterSig + "|" + app.selectedFilmKey;
    if (sig === lastShowSig) return;
    lastShowSig = sig;
    void loadShowtimes();
  });

  let filmsToken = 0;
  async function loadFilms() {
    const token = ++filmsToken;
    app.loadingFilms = true;
    app.error = "";
    try {
      const res = await fetchFilms({ ...baseParams(), search: searchDebounced });
      if (token !== filmsToken) return;
      app.films = res.films;
      app.failures = res.failures ?? [];
      if (!app.films.some((f) => f.filmKey === app.selectedFilmKey)) {
        app.selectedFilmKey = app.films[0]?.filmKey ?? "";
      }
    } catch (err) {
      if (token !== filmsToken) return;
      app.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (token === filmsToken) app.loadingFilms = false;
    }
  }

  let showToken = 0;
  async function loadShowtimes() {
    if (!app.selectedFilmKey) {
      app.showtimes = [];
      app.selectedFilm = undefined;
      return;
    }
    const token = ++showToken;
    app.loadingShowtimes = true;
    try {
      const res = await fetchFilmShowtimes(app.selectedFilmKey, baseParams());
      if (token !== showToken) return;
      app.showtimes = res.showtimes;
      app.selectedFilm =
        res.film ?? app.films.find((f) => f.filmKey === app.selectedFilmKey);
    } catch (err) {
      if (token !== showToken) return;
      app.error = err instanceof Error ? err.message : String(err);
    } finally {
      if (token === showToken) app.loadingShowtimes = false;
    }
  }

  function selectFilm(filmKey: string) {
    app.selectedFilmKey = filmKey;
    showDetail = true;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function backToList() {
    showDetail = false;
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  function exportIcs() {
    if (!app.selectedFilm || app.showtimes.length === 0) return;
    const ics = buildIcs(app.showtimes, app.selectedFilm.title);
    download(`spettacoli-${app.selectedFilm.filmKey.replace(/\s+/g, "-")}.ics`, ics);
  }

  const totalShowtimes = $derived(app.films.reduce((n, f) => n + f.showtimeCount, 0));
</script>

<header
  class="sticky top-0 z-30 border-b border-black/10 bg-white/85 backdrop-blur-md dark:border-white/10 dark:bg-[#0a0a0a]/85"
>
  <div class="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3">
    <div
      class="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900"
    >
      <Clapperboard size={18} />
    </div>
    <div class="min-w-0">
      <h1 class="truncate text-sm font-bold leading-tight sm:text-base">
        Cinema Bergamo · Programmazione unificata
      </h1>
      <p class="truncate text-[11px] text-black/50 dark:text-white/50">
        UCI Orio · Arcadia Stezzano · Notorious Curno
      </p>
    </div>
    <a
      href="https://github.com/D3dde/Cinema-Frontend"
      target="_blank"
      rel="noopener noreferrer"
      title="Codice su GitHub"
      aria-label="Codice su GitHub"
      class="ml-auto inline-flex h-9 w-9 items-center justify-center rounded-lg transition-colors hover:bg-black/5 dark:hover:bg-white/10"
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
        <path
          d="M12 .5C5.73.5.5 5.73.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.28-.01-1.02-.02-2-3.2.7-3.88-1.54-3.88-1.54-.52-1.33-1.28-1.68-1.28-1.68-1.05-.72.08-.7.08-.7 1.16.08 1.77 1.19 1.77 1.19 1.03 1.77 2.7 1.26 3.36.96.1-.75.4-1.26.73-1.55-2.55-.29-5.23-1.28-5.23-5.7 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.18 1.18a11.1 11.1 0 0 1 2.9-.39c.98 0 1.97.13 2.9.39 2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.43-2.69 5.41-5.25 5.69.41.36.78 1.06.78 2.14 0 1.55-.01 2.8-.01 3.18 0 .31.21.68.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.73 18.27.5 12 .5Z"
        />
      </svg>
    </a>
    <Button
      variant="ghost"
      size="icon"
      title={app.dark ? "Tema chiaro" : "Tema scuro"}
      onclick={() => app.setDark(!app.dark)}
    >
      {#if app.dark}<Sun size={18} />{:else}<Moon size={18} />{/if}
    </Button>
  </div>
</header>

<main class="mx-auto grid max-w-7xl gap-4 p-3 sm:p-4 lg:grid-cols-[360px_minmax(0,1fr)]">
  <aside
    class={cn(
      "min-h-0 flex-col gap-2 lg:sticky lg:top-[76px] lg:h-[calc(100vh-92px)]",
      showDetail ? "hidden lg:flex" : "flex",
    )}
  >
    <div class="lg:hidden">
      <FilterBar />
    </div>
    <div class="relative">
      <Search
        size={16}
        class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-black/40 dark:text-white/40"
      />
      <Input
        class="pl-9"
        placeholder="Cerca un film..."
        bind:value={app.search}
        aria-label="Cerca un film"
      />
    </div>
    <div
      class="min-h-[240px] flex-1 overflow-auto rounded-xl border border-black/10 bg-white lg:min-h-0 dark:border-white/10 dark:bg-white/[0.03]"
    >
      <FilmList
        films={app.films}
        selectedKey={app.selectedFilmKey}
        loading={app.loadingFilms}
        onselect={selectFilm}
      />
    </div>
  </aside>

  <section class={cn("min-w-0 space-y-4", !showDetail && "hidden lg:block")}>
    <Button variant="ghost" size="sm" class="-ml-2 lg:hidden" onclick={backToList}>
      <ArrowLeft size={16} />
      Film
    </Button>

    <FilterBar />

    {#if app.error}
      <div
        class="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-600 dark:text-red-400"
      >
        <TriangleAlert size={16} />
        {app.error}
      </div>
    {/if}

    {#if app.failures.length}
      <div
        class="flex flex-wrap items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-400"
      >
        <TriangleAlert size={14} />
        {#each app.failures as f (f.cinemaId)}
          <span>{f.cinemaName} non disponibile</span>
        {/each}
      </div>
    {/if}

    {#if app.selectedFilm}
      <div
        class="flex flex-wrap items-center gap-4 rounded-xl border border-black/10 bg-white p-4 dark:border-white/10 dark:bg-white/[0.03]"
      >
        <div
          class="h-[120px] w-20 shrink-0 overflow-hidden rounded-xl bg-black/10 dark:bg-white/10"
        >
          {#if app.selectedFilm.poster}
            <img src={app.selectedFilm.poster} alt="" class="h-full w-full object-cover" />
          {/if}
        </div>
        <div class="min-w-0 flex-1">
          <h2 class="text-xl font-bold leading-tight">{app.selectedFilm.title}</h2>
          {#if app.selectedFilm.originalTitle &&
            app.selectedFilm.originalTitle !== app.selectedFilm.title}
            <p class="text-sm text-black/50 dark:text-white/50">
              {app.selectedFilm.originalTitle}
            </p>
          {/if}
          <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
            <span
              class="rounded-md bg-black/5 px-2 py-0.5 dark:bg-white/10"
            >{app.showtimes.length} orari</span
            >
            <span class="rounded-md bg-black/5 px-2 py-0.5 dark:bg-white/10"
              >{app.selectedFilm.cinemas.length} cinema</span
            >
            {#if app.selectedFilm.duration}
              <span class="rounded-md bg-black/5 px-2 py-0.5 dark:bg-white/10"
                >{Math.floor(app.selectedFilm.duration / 60)}h
                {app.selectedFilm.duration % 60}m</span
              >
            {/if}
          </div>
        </div>
        <Button variant="secondary" size="sm" onclick={exportIcs} disabled={app.showtimes.length === 0}>
          <Download size={14} />
          Esporta .ics
        </Button>
      </div>

      {#if app.loadingShowtimes}
        <div class="flex items-center gap-2 py-8 text-sm text-black/50 dark:text-white/50">
          <span
            class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"
          ></span>
          Caricamento spettacoli…
        </div>
      {:else}
        <ShowtimeList showtimes={app.showtimes} />
      {/if}
    {:else if !app.loadingFilms}
      <div
        class="flex flex-col items-center gap-2 rounded-xl border border-dashed border-black/15 p-12 text-center dark:border-white/15"
      >
        <Film size={32} class="text-black/30 dark:text-white/30" />
        <p class="text-sm text-black/60 dark:text-white/60">
          Seleziona un film per vedere tutti gli spettacoli nei tre cinema.
        </p>
      </div>
    {/if}

    <p class="pb-6 pt-2 text-center text-[11px] text-black/35 dark:text-white/35">
      {totalShowtimes} spettacoli indicizzati · dati non ufficiali dalle API pubbliche dei cinema
    </p>
  </section>
</main>
