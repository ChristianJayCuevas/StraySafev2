<script setup lang="ts">
import AppLogo from '@/components/AppLogo.vue';
import { Link, usePage } from '@inertiajs/vue3';

const page = usePage();
const name = page.props.name;
const quote = page.props.quote;

defineProps<{
    title?: string;
    description?: string;
}>();
</script>

<template>
    <div class="relative grid h-dvh flex-col items-center justify-center px-8 sm:px-0 lg:max-w-none lg:grid-cols-2 lg:px-0">
        <div class="relative hidden h-full flex-col bg-muted p-10 text-white dark:border-r lg:flex">
            <div class="absolute inset-0 flex justify-center items-center">
  <img
    src="storage/images/PersonLearning.png"
    alt="StraySafe Background"
    class="w-3/4 h-3/4 object-cover"
  />
</div>

            <Link :href="route('home')" class="relative z-20 flex items-center text-sm font-medium">
                <AppLogo class="mr-2 size-2 fill-current text-white" />
            </Link>

            <div v-if="quote" class="relative z-20 mt-auto">
                <blockquote class="space-y-2">
                    <p class="text-lg text-gray-800 dark:text-white">"Animals don’t have a voice. But I do. My voice is for them. And I’ll never stay silent while they suffer."</p>
                    <!-- <p class="text-lg">&ldquo;{{ quote.message }}&rdquo;</p> -->
                    <footer class="text-sm text-black dark:text-neutral-300">Ricky Gervais</footer>
                </blockquote>
            </div>
        </div>
        <div class="lg:p-8">
            <div class="mx-auto flex w-full flex-col justify-center space-y-6 sm:w-[350px]">
                <div class="flex flex-col space-y-2 text-center">
                    <h1 class="text-xl font-medium tracking-tight" v-if="title">{{ title }}</h1>
                    <p class="text-sm text-muted-foreground" v-if="description">{{ description }}</p>
                </div>
                <slot />
            </div>
        </div>
    </div>
</template>
