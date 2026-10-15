<script lang="ts">
  import { Switch } from "bits-ui";

  interface Props {
    checked: boolean;
    label: string;
    onchange: (value: boolean) => void;
  }

  let { checked, label, onchange }: Props = $props();
</script>

<label class="flex cursor-pointer select-none items-center gap-2 text-xs font-medium">
  <Switch.Root
    {checked}
    onCheckedChange={onchange}
    class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full bg-black/20 transition-colors data-[state=checked]:bg-zinc-800 dark:bg-white/15 dark:data-[state=checked]:bg-zinc-200"
  >
    <Switch.Thumb
      class="block h-4 w-4 translate-x-0.5 rounded-full bg-white shadow transition-transform data-[state=checked]:translate-x-[18px] dark:bg-zinc-900"
    />
  </Switch.Root>
  <span>{label}</span>
</label>
