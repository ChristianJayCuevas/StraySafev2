<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref } from 'vue'
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import { Card } from '@/components/ui/card'
import Map from '@/components/map/Map.vue'
import CardData from '@/components/CardData.vue'

const chartOptions = ref({
  chart: {
    id: "vuechart-example",
  },
  xaxis: {
    categories: [1991, 1992, 1993, 1994, 1995, 1996, 1997, 1998],
  },
})

const series = ref([
  {
    name: "series-1",
    data: [30, 40, 35, 50, 49, 60, 70, 91],
  },
])

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
    },
];

</script>

<template>
    <Head title="Dashboard" />
    <AppLayout :breadcrumbs="breadcrumbs">
        <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
            <div class="grid auto-rows-min gap-4 md:grid-cols-4">
                <CardData title="Stray Dog Detected" :value="70" icon="dog" description="+100% compared to yesterday"/>
                <CardData title="Stray Cat Detected" :value="10" icon="cat" description="+100% compared to yesterday"/>
                <CardData title="Total Stray Detected" :value="100" icon="pawPrint" description="+100% compared to yesterday"/>
                <CardData title="Total Registered Pets" :value="60" icon="shieldCheck" description="+100% compared to yesterday"/>
            </div>
           <div class="grid auto-rows-min gap-4 md:grid-cols-2">
            <Card class="px-3 py-3 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
                <apexchart
                    type="area"
                    height="100%"
                    :options="chartOptions"
                    :series="series"
                ></apexchart>
            </Card>
            <Card class="px-4 py-4 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
                <Map />
            </Card>
            </div>
        </div>
    </AppLayout>
</template>
