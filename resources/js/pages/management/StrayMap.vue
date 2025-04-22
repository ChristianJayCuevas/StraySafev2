<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import { Card } from '@/components/ui/card'
import Map from '@/components/map/Map.vue'
import CardData from '@/components/CardData.vue'
import MapControls from '@/components/map/MapControls.vue'
const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Stray Map',
        href: '/straymap',
    },
];
const isDrawing = ref(false)
</script>

<template>

    <Head title="StrayMap" />
    <AppLayout :breadcrumbs="breadcrumbs">

        <!-- ✅ Transition Blur Overlay -->
        <transition name="fade-blur">
            <div v-if="isDrawing" class="fixed inset-0 z-40 backdrop-blur-sm bg-black/30 pointer-events-none"></div>
        </transition>
        <!-- ✅ Transparent Overlay -->
        <div v-if="isDrawing" class="fixed inset-0 z-30 bg-transparent pointer-events-auto"></div>

        <!-- Page content -->
        <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 relative z-50">
            <!-- Info Cards -->
            <div :class="[
                'grid auto-rows-min gap-4 md:grid-cols-3 transition-all duration-300',
                isDrawing ? 'blur-sm' : ''
            ]">
                <CardData title="Camera Pins" :value="70" icon="scanEye" description="+100% compared to yesterday" />
                <CardData title="Animal Pins" :value="10" icon="mapPinned" description="+100% compared to yesterday" />
                <CardData title="Total Area" :value="100" icon="map" description="+100% compared to yesterday" />
            </div>

            <!-- Map -->
            <Card
                class="relative px-4 py-4 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
                <Map @drawing="isDrawing = $event" />
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