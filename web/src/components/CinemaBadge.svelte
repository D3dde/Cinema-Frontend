<script lang="ts">
  import CinemaLogo from "./CinemaLogo.svelte";

  interface Props {
    cinemaId: string;
    class?: string;
    height?: number;
  }

  let { cinemaId, class: className, height = 16 }: Props = $props();
</script>

<CinemaLogo {cinemaId} {height} class={className} />
