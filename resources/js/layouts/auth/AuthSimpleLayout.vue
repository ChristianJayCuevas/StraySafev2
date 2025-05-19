<script setup lang="ts">
import AppLogoIcon from '@/components/AppLogoIcon.vue';
import { Link } from '@inertiajs/vue3';

defineProps<{
    title?: string;
    description?: string;
    backgroundImage?: string;
}>();
</script>

<template>
    <div 
        class="relative flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10 overflow-hidden"
        :style="backgroundImage ? `background-image: url('${backgroundImage}'); background-size: cover; background-position: center;` : 'background-color: var(--background);'"
    >
        <!-- Glassmorphic container -->
        <div class="w-full max-w-sm backdrop-blur-md bg-white/20 dark:bg-black/30 rounded-xl border border-white/20 dark:border-white/10 shadow-lg p-6">
            <div class="flex flex-col gap-8">
                <div class="flex flex-col items-center gap-4">
                    <Link :href="route('home')" class="flex flex-col items-center gap-2 font-medium">
                        <div class="mb-1 flex h-9 w-9 items-center justify-center rounded-md">
                            <AppLogoIcon class="size-9 fill-current text-[var(--foreground)] dark:text-white" />
                        </div>
                        <span class="sr-only">{{ title }}</span>
                    </Link>
                    <div class="space-y-2 text-center">
                        <h1 class="text-xl font-medium text-black dark:text-white">{{ title }}</h1>
                        <p class="text-center text-sm text-black/80 dark:text-white/80">{{ description }}</p>
                    </div>
                </div>
                <slot />
            </div>
        </div>
    </div>
</template>