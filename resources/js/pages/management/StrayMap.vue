<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
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

</script>

<template>

    <Head title="StrayMap" />
    <AppLayout :breadcrumbs="breadcrumbs">
        <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div class="grid auto-rows-min gap-4 md:grid-cols-3">
                <CardData title="Camera Pins" :value="70" icon="scanEye" description="+100% compared to yesterday" />
                <CardData title="Animal Pins" :value="10" icon="mapPinned" description="+100% compared to yesterday" />
                <CardData title="Total Area" :value="100" icon="map" description="+100% compared to yesterday" />
            </div>
            <div class="grid grid-cols-9 gap-4">
                <Card class="col-span-7 px-4 py-4 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
                    <Map />
                </Card>
                <div class="col-span-2">
                    <MapControls />
                </div>
            </div>
        </div>
    </AppLayout>
</template>
