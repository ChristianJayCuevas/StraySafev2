<script setup lang="ts">
import { useAppearance } from '@/composables/useAppearance';
import { Moon, Sun } from 'lucide-vue-next';
import { computed } from 'vue';

interface Props {
  class?: string;
}

const { class: containerClass = '' } = defineProps<Props>();
const { appearance, updateAppearance } = useAppearance();

const toggleAppearance = () => {
  const newMode = appearance.value === 'light' ? 'dark' : 'light';
  updateAppearance(newMode);
};

const currentIcon = computed(() => appearance.value === 'light' ? Sun : Moon);
const currentLabel = computed(() => appearance.value === 'light' ? 'Light' : 'Dark');
</script>


<template>

    <button
  @click="toggleAppearance"
  class="flex items-center rounded-md px-1.5 py-1.5 transition-colors text-neutral-700 dark:text-neutral-100 hover:bg-neutral-200 dark:hover:bg-neutral-700"
>
  <component :is="currentIcon" class="h-4 w-4" />
</button>

</template>