<!-- <script setup lang="ts">
import { onMounted, ref, onUnmounted, watch, computed, provide, defineEmits, defineProps } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar/utils'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'


import { useMapDraw } from '@/composables/useMapDraw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import MapControls from '@/components/map/MapControls.vue'
import MapCreate from '@/components/map/MapCreate.vue'
import { useMapCreate } from '@/composables/useMapCreate'
import { useUserAreas } from '@/composables/useMapArea'
import { useMapPins } from '@/composables/useMapPin'
import { useAnimalPinSimulator } from '@/composables/useAnimalPinSimulator'
import { useHeatMap } from '@/composables/useHeatMap'
import type { Feature } from 'geojson'
import { area } from '@unovis/ts/components/area/style'
import { toast } from 'vue-sonner'

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

const isSaveDialogOpen = ref(false)
const pendingFeature = ref<Feature | null>(null)
const areaName = ref(null);
const isDrawing = ref(false)

const areaInfo = ref();
const { personalMap, createdMap } = useMapCreate()
const selectedMap = computed(() => {
  return createdMap.value ?? personalMap.value ?? null
})

const {
  draw,
  mainMap,
  enableDrawingMode,
  cancelDrawing,
  finishDrawing,
  initializeDraw
} = useMapDraw(map, (feature) => {
  pendingFeature.value = feature
  isSaveDialogOpen.value = true
  console.log('Feature drawn:', feature)
})
const {
  areas,
  fetchUserAreas,
  displayUserAreas,
  saveUserArea,
  deleteUserArea,
} = useUserAreas(draw, mainMap)

const {
  isAddPinMode,
  cameraPins,
  enableAddPinMode,
  cancelAddPinMode,
  fetchCameraPins,
  displayCameraPins,
  onPinLocationSelected,
  saveCameraPin
} = useMapPins(mainMap)

const {
  cameraPins2,
  simulateAnimalPin,
  fetchCameraPins2,
  error,
  fetchAnimalPins
} = useAnimalPinSimulator(mainMap)

const {
  isHeatmapMode,
  toggleHeatmap,
  createHeatmapLayers,
  removeHeatmapLayers
} = useHeatMap(mainMap, cameraPins, areas)
provide('isAddPinMode', isAddPinMode);
provide('enableAddPinMode', enableAddPinMode);
provide('cancelAddPinMode', cancelAddPinMode);
provide('cameraPins', cameraPins);
provide('fetchCameraPins', fetchCameraPins);
provide('displayCameraPins', displayCameraPins);
provide('onPinLocationSelected', onPinLocationSelected);
provide('saveCameraPin', saveCameraPin);

provide('map', map);
provide('enableDrawingMode', enableDrawingMode);
provide('cancelDrawing', cancelDrawing);
provide('deleteUserArea', deleteUserArea)
provide('isDrawing', isDrawing)
provide('areas', areas);
provide('fetchUserAreas', fetchUserAreas);


const emit = defineEmits<{
  (e: 'drawing', value: boolean): void
}>()


const props = withDefaults(defineProps<{
  control?: boolean
  currentMap?: boolean
  selectMap?: boolean
  legend?: boolean
}>(), {
  control: true,
  currentMap: true,
  selectMap: true,
  legend: true,
})



const simulateStrayDog = async () => {
  await simulateAnimalPin({
    animal_type: 'dog',
    stray_status: 'stray',
    cameraName: 'Camera 1',
  })
}

const handleSaveArea = async () => {
  if (!pendingFeature.value) {
    console.warn('⛔ No feature to save!');
    return;
  }
  await saveUserArea(pendingFeature.value, false, selectedMap.value.id, areaName.value);
  areaName.value = null;
  toast.success('Area saved successfully!');
  isDrawing.value = false;
  isSaveDialogOpen.value = false;
  emit('drawing', false);
  fetchUserAreas(selectedMap.value.id);
  finishDrawing();
};

const handleCancelArea = async () => {
  cancelDrawing();
  toast.warning('Drawing cancelled!');
  isDrawing.value = false;
  isSaveDialogOpen.value = false;
  emit('drawing', false);
  finishDrawing();
};
watch(sidebarOpen, () => {
  setTimeout(() => {
    map.value?.resize()
  }, 300)
})
watch(selectedMap, (map) => {
  if (map?.id) {
    fetchUserAreas(map.id)
  }
}, { immediate: true })
watch(selectedMap, (map) => {
  if (map?.id) {
    fetchCameraPins(map.id)
  }
}, { immediate: true })

onMounted(() => {
  initializeMap()

})

async function initializeMap() {
  if (!mapContainer.value) {
    console.error('Map container element not found!')
    mapLoadError.value = true
    return
  }


  try {
    mapboxgl.accessToken = mapboxToken

    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [120.9842, 14.5995],
      zoom: 12,
      attributionControl: false,
    })
    map.value.on('load', () => {
  initializeDraw(); 
  fetchCameraPins(selectedMap.value.id); 
  fetchUserAreas(selectedMap.value.id);
  fetchCameraPins2(selectedMap.value.id);
  fetchAnimalPins(selectedMap.value.id);

});

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
const selectedAreaId = ref('')
</script>

<template>

  <div ref="mapContainer" class="h-[430px] xl:h-[550px] 2xl:h-[600px] rounded overflow-hidden" />

  <div v-if="props.control" class="absolute top-6 left-6 z-10 w-[210px]">
    <MapControls @drawing="emit('drawing', $event)" :selected-map="selectedMap" :selected-map-id="selectedMap?.id"/>
   
  </div>

  <div v-if="props.currentMap" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 text-center">
    <div v-if="selectedMap"
      class="text-sm font-medium bg-white/80 dark:bg-black/50 px-4 py-1 rounded-full shadow backdrop-blur border">
      Current Map: <strong>{{ selectedMap.name }}</strong>
    </div>
  </div>

  <div v-if="props.selectMap" class="flex flex-col gap-2 absolute top-6 right-6 z-10">
    <MapCreate  :selected-map="selectedMap?.id"/>
  </div>
  <div v-if="props.legend" class="absolute bottom-6 right-6 z-20 bg-white/80 dark:bg-black/60 p-3 rounded-lg shadow-md backdrop-blur-md w-[170px] text-sm">
    <h4 class="font-bold mb-2">Legend</h4>
    <div class="flex items-center gap-2 mb-1">
      <div class="w-4 h-4 rounded-sm bg-cyan-400 opacity-60 border border-cyan-600"></div>
      <span>Saved Area</span>
    </div>
    <div class="flex items-center gap-2">
      <div class="w-4 h-4">

        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512" id="cctv">
          <defs>
            <linearGradient id="a" x1="256" x2="256" y1="507.946" y2="4.054" gradientTransform="rotate(45 256 256)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#a6d8f4"></stop>
              <stop offset="1" stop-color="#dff3fd"></stop>
            </linearGradient>
            <linearGradient id="b" x1="256" x2="256" y1="83.078" y2="428.922" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#0068e7"></stop>
              <stop offset="1" stop-color="#26b3e8"></stop>
            </linearGradient>
          </defs>
          <circle cx="256" cy="256" r="251.946" fill="url(#a)" transform="rotate(-45 256 256)"></circle>
          <path fill="url(#b)" d="M402.511,235.596c.992,1.751,1.328,3.876,.769,5.962l-10.505,39.207c-1.13,4.217-5.506,6.743-9.723,5.613l-14.302-3.832 8.497-31.71c.463-1.727 1.52-3.038 3.111-3.855l22.154-11.384Zm-125.661-7.647l87.319,23.397-10.385,38.759c-2.177,8.125-10.606,12.991-18.731,10.814l-72.954-19.548c.134,1.203.206,2.424.206,3.663,0,14.25-9.132,26.366-21.862,30.82v9.476c0,30.086-24.617,54.703-54.702,54.703H116.797v18.416c0,5.852-4.788,10.641-10.641,10.641h-4.39v13.582c0,3.452-2.798,6.25-6.25,6.25s-6.25-2.798-6.25-6.25v-106.845c0-3.452,2.798-6.25,6.25-6.25s6.25,2.798,6.25,6.25v13.582h4.39c5.853,0,10.641,4.789,10.641,10.641v18.416h68.945c18.182,0,33.136-14.954,33.136-33.136v-9.476c-12.73-4.454-21.862-16.569-21.862-30.82,0-7.262,2.372-13.969,6.383-19.392l-64.114-17.179c-16.384-4.39-26.197-21.387-21.807-37.77l.603-2.249 132.368,35.468c1.985,.53 4.003,.041 5.497-1.145l20.905-14.817Zm-35.986,57.085c0-6.188-5.016-11.204-11.204-11.204s-11.204,5.016-11.204,11.204,5.016,11.204,11.204,11.204,11.204-5.016,11.204-11.204Zm89.612-22.704l4.709,1.262c3.33,.89 6.752-1.089 7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642l-4.709-1.262c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642Zm92.259-51.181l-54.955,28.24-90.524-24.256c-1.8-.48-3.708-.127-5.225,.952l-21.178,15.01-129.543-34.711,8.519-31.793c4.39-16.384 21.387-26.197 37.77-21.807l255.135,68.363Zm-225.203-17.378l-48.686-13.045c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642l48.686,13.045c3.33,.89,6.752-1.089,7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642Zm81.774-45.086c0,7.832 6.35,14.182 14.182,14.182s14.182-6.349 14.182-14.182-6.349-14.182-14.182-14.182-14.182,6.349-14.182,14.182Zm-33.378-32.394c2.672,2.178 6.608,1.774 8.789-.902 10.396-12.775 24.16-19.811 38.772-19.811s28.376,7.036 38.765,19.811c1.236,1.517 3.044,2.305 4.854,2.305 1.39,0 2.786-.458 3.939-1.403 2.679-2.178 3.083-6.113 .909-8.793-12.812-15.748-30.03-24.421-48.467-24.421s-35.652,8.672-48.467,24.421c-2.178,2.679-1.777,6.615 .905,8.793Zm71.875,16.86c1.236,1.52 3.033,2.309 4.854,2.309 1.39,0 2.779-.461 3.939-1.403 2.679-2.178 3.083-6.114 .902-8.793-8.967-11.024-21.043-17.094-34.008-17.094s-25.049,6.073-34.015,17.094c-2.178,2.679-1.771,6.614 .902,8.793,2.683,2.178 6.621,1.774 8.793-.905,6.551-8.048,15.187-12.481,24.32-12.481s17.766,4.433,24.314,12.481Z"></path>
        </svg>
      </div>
      <span>CCTV Pin</span>
    </div>
</div>

  <AlertDialog v-model:open="isSaveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Save this area?</AlertDialogTitle>
        <AlertDialogDescription>
          Please name the area and save it.
          <input v-model="areaName" type="text" placeholder="Area Name" class="border rounded p-2 mt-2 w-full" />
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancelArea">Cancel</AlertDialogCancel>
        <AlertDialogAction @click="handleSaveArea">Save</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>


</template>

<style scoped>
.error {
  border: 2px solid red;
}
</style> -->
<script setup lang="ts">
import { onMounted, ref, onUnmounted, watch, computed, provide, defineEmits, defineProps } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { useSidebar } from '@/components/ui/sidebar/utils'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'

// @ts-ignore
import { useMapDraw } from '@/composables/useMapDraw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'
import MapControls from '@/components/map/MapControls.vue'
import MapCreate from '@/components/map/MapCreate.vue'
import { useMapCreate } from '@/composables/useMapCreate'
import { useUserAreas } from '@/composables/useMapArea'
import { useMapPins } from '@/composables/useMapPin'
import { useHeatmap } from '@/composables/useHeatMap'
import { useAnimalPinSimulator } from '@/composables/useAnimalPinSimulator'
import type { Feature } from 'geojson'
import { area } from '@unovis/ts/components/area/style'
import { toast } from 'vue-sonner'
// Token
const mapboxToken = 'pk.eyJ1IjoiMS1heWFub24iLCJhIjoiY20ycnAzZW5pMWZpZTJpcThpeTJjdDU1NCJ9.7AVb_LJf6sOtb-QAxwR-hg'

// Sidebar state
const { open: sidebarOpen } = useSidebar()

const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
if (csrfToken) {
  axios.defaults.headers.common['X-CSRF-TOKEN'] = csrfToken
}

const mapContainer = ref(null);
const map = ref(null);
const mapLoadError = ref(false)
let mapLoadTimeout: ReturnType<typeof setTimeout> | null = null

const isSaveDialogOpen = ref(false)
const pendingFeature = ref<Feature | null>(null)
const areaName = ref(null);
const isDrawing = ref(false)
// Function to call the useMapDraw composable
const areaInfo = ref();
const { personalMap, createdMap } = useMapCreate()
const selectedMap = computed(() => {
  return createdMap.value ?? personalMap.value ?? null
})

const {
  draw,
  mainMap,
  enableDrawingMode,
  cancelDrawing,
  finishDrawing,
  initializeDraw
} = useMapDraw(map, (feature) => {
  pendingFeature.value = feature
  isSaveDialogOpen.value = true
  console.log('Feature drawn:', feature)
})
const {
  areas,
  fetchUserAreas,
  displayUserAreas,
  saveUserArea,
  deleteUserArea,
} = useUserAreas(draw, mainMap)

const {
  isAddPinMode,
  cameraPins,
  enableAddPinMode,
  cancelAddPinMode,
  fetchCameraPins,
  displayCameraPins,
  onPinLocationSelected,
  saveCameraPin
} = useMapPins(mainMap)

const {
  isHeatmapMode,
  toggleHeatmap,
  createHeatmapLayers,
  removeHeatmapLayers
} = useHeatmap(mainMap, cameraPins, areas)

const {
  cameraPins2,
  simulateAnimalPin,
  fetchCameraPins2,
  error,
  fetchAnimalPins
} = useAnimalPinSimulator(mainMap)


provide('isAddPinMode', isAddPinMode);
provide('enableAddPinMode', enableAddPinMode);
provide('cancelAddPinMode', cancelAddPinMode);
provide('cameraPins', cameraPins);
provide('fetchCameraPins', fetchCameraPins);
provide('displayCameraPins', displayCameraPins);
provide('onPinLocationSelected', onPinLocationSelected);
provide('saveCameraPin', saveCameraPin);

provide('map', map);
provide('enableDrawingMode', enableDrawingMode);
provide('cancelDrawing', cancelDrawing);
provide('deleteUserArea', deleteUserArea)
provide('isDrawing', isDrawing)
provide('areas', areas);
provide('fetchUserAreas', fetchUserAreas);
provide('isHeatmapMode', isHeatmapMode);
provide('toggleHeatmap', toggleHeatmap);


const emit = defineEmits<{
  (e: 'drawing', value: boolean): void
}>()


const props = withDefaults(defineProps<{
  control?: boolean
  currentMap?: boolean
  selectMap?: boolean
  legend?: boolean
  heatmap?: boolean
  mobile?: boolean
  mobileSelect?: boolean
}>(), {
  control: true,
  currentMap: true,
  selectMap: true,
  legend: true,
  heatmap: false,
  mobileSelect: false,
})

// Watch heatmap prop and toggle mode accordingly
watch(() => props.heatmap, (newValue) => {
  toggleHeatmap(newValue)
}, { immediate: true })

//Map state

const simulateStrayDog = async () => {
  await simulateAnimalPin({
    animal_type: 'dog',
    stray_status: 'stray',
    cameraName: 'Camera 1',
  })
}

const handleSaveArea = async () => {
  if (!pendingFeature.value) {
    console.warn('⛔ No feature to save!');
    return;
  }
  await saveUserArea(pendingFeature.value, false, selectedMap.value.id, areaName.value);
  areaName.value = null;
  toast.success('Area saved successfully!');
  isDrawing.value = false;
  isSaveDialogOpen.value = false;
  emit('drawing', false);
  fetchUserAreas(selectedMap.value.id, props.heatmap);
  finishDrawing();
};

const handleCancelArea = async () => {
  cancelDrawing();
  toast.warning('Drawing cancelled!');
  isDrawing.value = false;
  isSaveDialogOpen.value = false;
  emit('drawing', false);
  finishDrawing();
};
watch(sidebarOpen, () => {
  setTimeout(() => {
    map.value?.resize()
  }, 300)
})
watch(selectedMap, (map) => {
  if (map?.id) {
    fetchUserAreas(map.id, props.heatmap)
  }
}, { immediate: true })
watch(selectedMap, (map) => {
  if (map?.id) {
    fetchCameraPins(map.id)
  }
}, { immediate: true })

onMounted(() => {
  initializeMap()
})

async function initializeMap() {
  if (!mapContainer.value) {
    console.error('Map container element not found!')
    mapLoadError.value = true
    return
  }

  try {
    mapboxgl.accessToken = mapboxToken

    map.value = new mapboxgl.Map({
      container: mapContainer.value,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [120.9842, 14.5995],
      zoom: 12,
      attributionControl: false,
    })
    map.value.on('load', () => {
      initializeDraw(); // ✅ Ensure draw is initialized after map is ready
      fetchCameraPins(selectedMap.value.id); // 🛬 Fetch pins only after map load
      fetchUserAreas(selectedMap.value.id, props.heatmap);
      fetchCameraPins2(selectedMap.value.id);
      fetchAnimalPins(selectedMap.value.id);
      
      // Initialize heatmap if the heatmap prop is true
      if (props.heatmap) {
        toggleHeatmap(true);
      }
    });
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
const selectedAreaId = ref('')
</script>

<template>

  <div v-if="props.mobile"> 
  <div ref="mapContainer" class="h-screen w-full max-h-[100vh] rounded overflow-hidden" /> 
</div> 
<div v-else> 
  <div ref="mapContainer" class="h-[430px] xl:h-[550px] 2xl:h-[600px] rounded overflow-hidden" /> 
</div>
  <!-- Controls panel -->
   <Button @click="simulateStrayDog" />
  <div v-if="props.control" class="absolute top-6 left-6 z-10 w-[210px]">
    <MapControls 
      @drawing="emit('drawing', $event)" 
      :selected-map="selectedMap" 
      :selected-map-id="selectedMap?.id"
      :heatmap-mode="isHeatmapMode"
      @toggle-heatmap="toggleHeatmap($event)"
    />
  </div>
  
  <!-- Current Map Label -->
  <div v-if="props.currentMap" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 text-center">
    <div v-if="selectedMap"
      class="text-sm font-medium bg-white/80 dark:bg-black/50 px-4 py-1 rounded-full shadow backdrop-blur border">
      Current Map: <strong>{{ selectedMap.name }}</strong>
      <span v-if="isHeatmapMode" class="ml-2 text-xs px-2 py-0.5 bg-gradient-to-r from-green-500 to-red-500 rounded-full text-white">
        Heatmap Active
      </span>
    </div>
  </div>
  
  <!-- Select Map Button -->

  <div v-if="props.selectMap" class="flex flex-col gap-2 absolute top-6 right-6 z-10">
    <MapCreate :selected-map="selectedMap?.id"/>
  </div>

  <div v-if="props.mobileSelect" class="flex flex-col gap-2 absolute top-20 right-6 z-10">
    <MapCreate :selected-map="selectedMap?.id"/>
  </div>
  
  <!-- Legend -->
  <div v-if="props.legend" class="absolute bottom-6 right-6 z-20 bg-white/80 dark:bg-black/60 p-3 rounded-lg shadow-md backdrop-blur-md w-[170px] text-sm">
    <h4 class="font-bold mb-2">Legend</h4>
    <!-- Standard mode legend -->
    <template v-if="!isHeatmapMode">
      <div class="flex items-center gap-2 mb-1">
        <div class="w-4 h-4 rounded-sm bg-cyan-400 opacity-60 border border-cyan-600"></div>
        <span>Saved Area</span>
      </div>
      <div class="flex items-center gap-2">
        <div class="w-4 h-4">
          <!-- CCTV icon -->
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 512 512" id="cctv">
            <defs>
              <linearGradient id="a" x1="256" x2="256" y1="507.946" y2="4.054" gradientTransform="rotate(45 256 256)" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#a6d8f4"></stop>
                <stop offset="1" stop-color="#dff3fd"></stop>
              </linearGradient>
              <linearGradient id="b" x1="256" x2="256" y1="83.078" y2="428.922" gradientUnits="userSpaceOnUse">
                <stop offset="0" stop-color="#0068e7"></stop>
                <stop offset="1" stop-color="#26b3e8"></stop>
              </linearGradient>
            </defs>
            <circle cx="256" cy="256" r="251.946" fill="url(#a)" transform="rotate(-45 256 256)"></circle>
            <path fill="url(#b)" d="M402.511,235.596c.992,1.751,1.328,3.876,.769,5.962l-10.505,39.207c-1.13,4.217-5.506,6.743-9.723,5.613l-14.302-3.832 8.497-31.71c.463-1.727 1.52-3.038 3.111-3.855l22.154-11.384Zm-125.661-7.647l87.319,23.397-10.385,38.759c-2.177,8.125-10.606,12.991-18.731,10.814l-72.954-19.548c.134,1.203.206,2.424.206,3.663,0,14.25-9.132,26.366-21.862,30.82v9.476c0,30.086-24.617,54.703-54.702,54.703H116.797v18.416c0,5.852-4.788,10.641-10.641,10.641h-4.39v13.582c0,3.452-2.798,6.25-6.25,6.25s-6.25-2.798-6.25-6.25v-106.845c0-3.452,2.798-6.25,6.25-6.25s6.25,2.798,6.25,6.25v13.582h4.39c5.853,0,10.641,4.789,10.641,10.641v18.416h68.945c18.182,0,33.136-14.954,33.136-33.136v-9.476c-12.73-4.454-21.862-16.569-21.862-30.82,0-7.262,2.372-13.969,6.383-19.392l-64.114-17.179c-16.384-4.39-26.197-21.387-21.807-37.77l.603-2.249 132.368,35.468c1.985,.53 4.003,.041 5.497-1.145l20.905-14.817Zm-35.986,57.085c0-6.188-5.016-11.204-11.204-11.204s-11.204,5.016-11.204,11.204,5.016,11.204,11.204,11.204,11.204-5.016,11.204-11.204Zm89.612-22.704l4.709,1.262c3.33,.89 6.752-1.089 7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642l-4.709-1.262c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642Zm92.259-51.181l-54.955,28.24-90.524-24.256c-1.8-.48-3.708-.127-5.225,.952l-21.178,15.01-129.543-34.711,8.519-31.793c4.39-16.384 21.387-26.197 37.77-21.807l255.135,68.363Zm-225.203-17.378l-48.686-13.045c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642l48.686,13.045c3.33,.89,6.752-1.089,7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642Zm81.774-45.086c0,7.832 6.35,14.182 14.182,14.182s14.182-6.349 14.182-14.182-6.349-14.182-14.182-14.182-14.182,6.349-14.182,14.182Zm-33.378-32.394c2.672,2.178 6.608,1.774 8.789-.902 10.396-12.775 24.16-19.811 38.772-19.811s28.376,7.036 38.765,19.811c1.236,1.517 3.044,2.305 4.854,2.305 1.39,0 2.786-.458 3.939-1.403 2.679-2.178 3.083-6.113 .909-8.793-12.812-15.748-30.03-24.421-48.467-24.421s-35.652,8.672-48.467,24.421c-2.178,2.679-1.777,6.615 .905,8.793Zm71.875,16.86c1.236,1.52 3.033,2.309 4.854,2.309 1.39,0 2.779-.461 3.939-1.403 2.679-2.178 3.083-6.114 .902-8.793-8.967-11.024-21.043-17.094-34.008-17.094s-25.049,6.073-34.015,17.094c-2.178,2.679-1.771,6.614 .902,8.793,2.683,2.178 6.621,1.774 8.793-.905,6.551-8.048,15.187-12.481,24.32-12.481s17.766,4.433,24.314,12.481Z"></path>
          </svg>
        </div>
        <span>CCTV Pin</span>
      </div>
    </template>
    
    <!-- Heatmap mode legend -->
    <template v-else>
      <div class="flex flex-col gap-2">
        <!-- Green area heatmap -->
        <div class="flex items-center gap-2 mb-1">
          <div class="w-4 h-4 rounded-sm bg-gradient-to-r from-green-200 to-green-800"></div>
          <span>Area Density</span>
        </div>
        
        <!-- Red pin heatmap -->
        <div class="flex items-center gap-2">
          <div class="w-4 h-4 rounded-sm bg-gradient-to-r from-red-200 to-red-800"></div>
          <span>Camera Density</span>
        </div>
        
        <!-- Heatmap info -->
        <div class="mt-2 text-xs text-gray-600 dark:text-gray-400">
          Darker colors indicate higher concentration
        </div>
      </div>
    </template>
  </div>
  
  <!-- Confirmation for Saving the Drawn Polygon -->
  <AlertDialog v-model:open="isSaveDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Save this area?</AlertDialogTitle>
        <AlertDialogDescription>
          Please name the area and save it.
          <input v-model="areaName" type="text" placeholder="Area Name" class="border rounded p-2 mt-2 w-full" />
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancelArea">Cancel</AlertDialogCancel>
        <AlertDialogAction @click="handleSaveArea">Save</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>

<style scoped>
.error {
  border: 2px solid red;
}
</style>