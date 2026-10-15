<script lang="ts">
  import { cn } from "$lib/utils";
  import type { Snippet } from "svelte";
  import type { HTMLButtonAttributes } from "svelte/elements";

  type Variant = "default" | "secondary" | "outline" | "ghost" | "danger";
  type Size = "sm" | "md" | "lg" | "icon";

  interface Props extends HTMLButtonAttributes {
    variant?: Variant;
    size?: Size;
    class?: string;
    children?: Snippet;
  }

  let {
    variant = "default",
    size = "md",
    class: className,
    children,
    ...rest
  }: Props = $props();

  const base =
    "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black/20 dark:focus-visible:ring-white/25 disabled:opacity-50 disabled:pointer-events-none cursor-pointer select-none";

  const variants: Record<Variant, string> = {
    default:
      "bg-zinc-900 text-white hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200",
    secondary:
      "bg-black/[0.06] text-current hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15",
    outline:
      "border border-black/15 hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10",
    ghost: "hover:bg-black/5 dark:hover:bg-white/10",
    danger: "bg-red-600 text-white hover:bg-red-500",
  };

  const sizes: Record<Size, string> = {
    sm: "h-8 px-3 text-xs",
    md: "h-10 px-4 text-sm",
    lg: "h-12 px-6 text-base",
    icon: "h-9 w-9",
  };
</script>

<button class={cn(base, variants[variant], sizes[size], className)} {...rest}>
  {@render children?.()}
</button>
