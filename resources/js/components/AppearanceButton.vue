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
  <div :class="['inline-flex rounded-lg bg-neutral-100 p-1 dark:bg-neutral-800', containerClass]">
    <button
      @click="toggleAppearance"
      class="flex items-center rounded-md px-1.5 py-1.5 transition-colors bg-white shadow-xs dark:bg-neutral-700 dark:text-neutral-100"
    >
      <component :is="currentIcon" class="h-4 w-4" />
    </button>
  </div>
</template>