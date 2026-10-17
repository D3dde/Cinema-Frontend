<script lang="ts">
  interface Props {
    /** rendered logo height in px */
    height?: number;
    class?: string;
  }

  let { height = 12, class: className = "" }: Props = $props();
</script>

<svg
  viewBox="0 0 100 34"
  height={height}
  width={Math.round(height * (100 / 34))}
  role="img"
  aria-label="Letterboxd"
  class={className}
>
  <circle cx="17" cy="17" r="17" fill="#FF8000" />
  <circle cx="50" cy="17" r="17" fill="#00E054" />
  <circle cx="83" cy="17" r="17" fill="#40BCF4" />
</svg>
