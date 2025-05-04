<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref, onMounted } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import { Card } from '@/components/ui/card'
import Map from '@/components/map/Map.vue'
import CardData from '@/components/CardData.vue'
import MapControls from '@/components/map/MapControls.vue'
import { Skeleton } from '@/components/ui/skeleton'
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Stray Map',
        href: '/straymap',
    },
];
const isDrawing = ref(false)
const isLoading = ref(true)

onMounted(() => {
    setTimeout(() => {
        isLoading.value = false
    }, 2000)
})
</script>

<template>

    <Head title="StrayMap" />
    <AppLayout :breadcrumbs="breadcrumbs">

        <transition name="fade-blur">
            <div v-if="isDrawing" class="fixed inset-0 z-40 backdrop-blur-sm bg-black/30 pointer-events-none"></div>
        </transition>

        <div v-if="isDrawing" class="fixed inset-0 z-30 bg-transparent pointer-events-auto"></div>

        <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 relative z-50">
            <div :class="[
                'grid auto-rows-min gap-4 md:grid-cols-3 transition-all duration-300',
                isDrawing ? 'blur-sm' : ''
            ]">
                <template v-if="isLoading">
                    <Skeleton class="h-[180px] w-full rounded-xl" v-for="i in 3" :key="i" />
                </template>
                <template v-else>
                    <CardData title="Camera Pins" :value="70" icon="scanEye"
                        description="+100% compared to yesterday" />
                    <CardData title="Animal Pins" :value="10" icon="mapPinned"
                        description="+100% compared to yesterday" />
                    <CardData title="Total Area" :value="100" icon="map" description="+100% compared to yesterday" />
                </template>
            </div>

            <Card
                class="relative px-4 py-4 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
                <template v-if="isLoading">
                    <Skeleton class="h-[600px] w-full rounded-xl" />
                </template>
                <template v-else>
                    <Map @drawing="isDrawing = $event" />
                </template>
            </Card>
        </div>
    </AppLayout>
</template>

<style scoped>
.fade-blur-enter-active,
.fade-blur-leave-active {
    transition: opacity 0.3s ease-in-out;
}

.fade-blur-enter-from,
.fade-blur-leave-to {
    opacity: 0;
}

.fade-blur-enter-to,
.fade-blur-leave-from {
    opacity: 1;
}
</style>