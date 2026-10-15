<script lang="ts">
  import Badge from "./ui/Badge.svelte";
  import HallLogo from "./HallLogo.svelte";
  import { HALL_LOGOS } from "$lib/brands";
  import { hallStyle } from "$lib/utils";

  interface Props {
    hall: string;
  }

  let { hall }: Props = $props();
  const style = $derived(hallStyle(hall));
  const logo = $derived(HALL_LOGOS[hall]);
</script>

{#if logo}
  <HallLogo {hall} label={style.label} height={hall === "IMAX" ? 12 : 15} />
{:else}
  <Badge class={style.class}>{style.label}</Badge>
{/if}
