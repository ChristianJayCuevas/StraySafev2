<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref, onMounted } from 'vue'
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import { Card } from '@/components/ui/card'
import Map from '@/components/map/Map.vue'
import CardData from '@/components/CardData.vue'
import { Skeleton } from '@/components/ui/skeleton'
import axios from 'axios'

const stats = ref({
  dog_pins: 0,
  cat_pins: 0,
  animal_pins: 0,
  registered_pets: 0, // Add this if you have a separate endpoint for it
})

const fetchStats = async () => {
  try {
    const response = await axios.get('/stats/summary2')
    stats.value = response.data
  } catch (error) {
    console.error('Error fetching stats:', error)
  }
}

const chartOptions = ref({
  chart: {
    id: "vuechart-example",
  },
  xaxis: {
    categories: ['Monday','Tuesday', 'Wednesday'],
  },
})

const series = ref([
  {
    name: "series-1",
    data: [0,2,4],
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
  fetchStats()
  setTimeout(() => {
    isLoading.value = false
  }, 1000)
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
          <CardData title="Stray Dog Detected" :value="stats.dog_pins" icon="dog" description="Stray dogs detected" />
  <CardData title="Stray Cat Detected" :value="stats.cat_pins" icon="cat" description="Stray cats detected" />
  <CardData title="Total Stray Detected" :value="stats.animal_pins" icon="pawPrint" description="Total strays detected" />
  <CardData title="Total Registered Pets" :value="stats.registered_pets" icon="shieldCheck" description="Total registered pets" />
        </template>
      </div>
      <div class="grid auto-rows-min gap-4 md:grid-cols-2">
        <Card
          class="px-3 py-3 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
          <template v-if="isLoading">
            <Skeleton class="h-[500px] w-full rounded-md" />
          </template>
          <template v-else>
            <apexchart type="area" height="600px" :options="chartOptions" :series="series" />
          </template>
        </Card>
        <Card
          class="px-4 py-4 hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300">
          <template v-if="isLoading">
            <Skeleton class="h-[600px] w-full rounded-md" />
          </template>
          <template v-else>
            <div >
            <Map 
  :control="false" 
  :currentMap="true" 
  :selectMap="false" 
  :legend="true"
  :heatmap="true" 
/>
            </div>
          </template>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>
