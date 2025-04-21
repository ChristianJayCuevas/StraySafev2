<script setup lang="ts">
import { onMounted, ref, onUnmounted, watch, computed, provide } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { usePage } from '@inertiajs/vue3'
import { SharedData } from '@/types'
import { useSidebar } from '@/components/ui/sidebar/utils'
// @ts-ignore
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import { useMapDraw } from '@/composables/useMapDraw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import MapControls from '@/composables/useMapControls'

const mapboxToken = 'pk.eyJ1IjoiMS1heWFub24iLCJhIjoiY20ycnAzZW5pMWZpZTJpcThpeTJjdDU1NCJ9.7AVb_LJf6sOtb-QAxwR-hg'
const { open: sidebarOpen } = useSidebar() 

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
if (csrfToken) {
  axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken
}

const mapContainer = ref(null);
const map = ref(null);
const mapLoadError = ref(false)
let mapLoadTimeout: ReturnType<typeof setTimeout> | null = null

const { enableDrawingMode, disableDrawingMode, cancelDrawing } = useMapDraw(map);
provide('map', map);
provide('enableDrawingMode', enableDrawingMode);
provide('disableDrawingMode', disableDrawingMode);
provide('cancelDrawing', cancelDrawing);


const userAreas = ref([])
const userMapId = 'test'
const emit = defineEmits(['draw-complete'])

watch(sidebarOpen, () => {
  setTimeout(() => {
    map.value?.resize()
  }, 300)
})

onMounted(() => {
  initializeMap()
  map.value.on('load', () => {
    const { setupDrawEvents } = useMapDraw(map.value, emit, userMapId, userAreas)
    setupDrawEvents()
  })
})

async function initializeMap() {
  if (!mapContainer.value) {
    console.error('Map container element not found!')
    mapLoadError.value = true
    return
  }

  // Timeout check in case map fails to load
  mapLoadTimeout = setTimeout(() => {
    if (!map.value || !map.value.loaded()) {
      console.error('Map failed to load after timeout')
      mapLoadError.value = true
      mapContainer.value?.classList.add('error')
    }
  }, 10000)

  try {
    mapboxgl.accessToken = mapboxToken

    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [120.9842, 14.5995], 
      zoom: 12,
      attributionControl: false,
    })
      
  } catch (error) {
    console.error('Error initializing map:', error)
    mapLoadError.value = true
    mapContainer.value?.classList.add('error')
  }
}

onUnmounted(() => {
  if (mapLoadTimeout) {
    clearTimeout(mapLoadTimeout)
    mapLoadTimeout = null
  }

  if (map.value) {
    map.value.remove()
    map.value = null
  }
})
</script>

<template>
  <div ref="mapContainer" class="h-[350px] xl:h-[550px] 2xl:h-[600px] rounded transition-all duration-300" />
</template>

<style scoped>
.error {
  border: 2px solid red;
}
.map-container {
  width: 100%;
  height: 430px;
  border-radius: 0.5rem;
}

@media screen and (min-width: 1910px) {
  .map-container {
    height: 600px;
  }
  
}
</style>
