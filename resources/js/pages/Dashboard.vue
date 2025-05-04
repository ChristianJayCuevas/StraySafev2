<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref, onMounted } from 'vue'
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import { Card } from '@/components/ui/card'
import Map from '@/components/map/Map.vue'
import CardData from '@/components/CardData.vue'
import { Skeleton } from '@/components/ui/skeleton'

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
const isLoading = ref(true)

onMounted(() => {
  setTimeout(() => {
    isLoading.value = false
  }, 2000)
})
</script>

<template>

  <Head title="Dashboard" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
      <div class="grid auto-rows-min gap-4 md:grid-cols-4">
        <template v-if="isLoading">
          <Skeleton class="h-[180px] w-full rounded-xl" v-for="i in 4" :key="i" />
        </template>
        <template v-else>
          <CardData title="Stray Dog Detected" :value="70" icon="dog" description="+100% compared to yesterday" />
          <CardData title="Stray Cat Detected" :value="10" icon="cat" description="+100% compared to yesterday" />
          <CardData title="Total Stray Detected" :value="100" icon="pawPrint"
            description="+100% compared to yesterday" />
          <CardData title="Total Registered Pets" :value="60" icon="shieldCheck"
            description="+100% compared to yesterday" />
        </template>
      </div>
      <div class="grid auto-rows-min gap-4 md:grid-cols-2">
        <Card
          class="px-3 py-3 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
          <template v-if="isLoading">
            <Skeleton class="h-[600px] w-full rounded-md" />
          </template>
          <template v-else>
            <apexchart type="area" height="100%" :options="chartOptions" :series="series" />
          </template>
        </Card>
        <Card
          class="px-4 py-4 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
          <template v-if="isLoading">
            <Skeleton class="h-[600px] w-full rounded-md" />
          </template>
          <template v-else>
            <Map :control="false" :currentMap="false" :selectMap="false" :legend="false" />
          </template>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>
