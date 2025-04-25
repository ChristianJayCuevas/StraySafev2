<script setup lang="ts">
import { onMounted, ref, onUnmounted, watch, computed, provide, defineEmits, defineProps } from 'vue'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import axios from 'axios'
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
  updateUserArea,
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
} = useMapPins(mainMap, selectedMap.value?.id)

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
}>(), {
  control: true,
  currentMap: true,
  selectMap: true
})

//Map state


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

  // Timeout check in case map fails to load
  // mapLoadTimeout = setTimeout(() => {
  //   if (!map.value || !map.value.loaded()) {
  //     console.error('Map failed to load after timeout')
  //     mapLoadError.value = true
  //     mapContainer.value?.classList.add('error')
  //   }
  // }, 10000)

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
  <!-- Controls panel -->
  <div v-if="props.control" class="absolute top-6 left-6 z-10 w-[210px]">
    <MapControls @drawing="emit('drawing', $event)"/>
  </div>

  <!-- Current Map Label -->
  <div v-if="props.currentMap" class="absolute bottom-6 left-1/2 -translate-x-1/2 z-50 text-center">
    <div v-if="selectedMap"
      class="text-sm font-medium bg-white/80 dark:bg-black/50 px-4 py-1 rounded-full shadow backdrop-blur border">
      Current Map: <strong>{{ selectedMap.name }}</strong>
    </div>
  </div>
  <!-- Select Map Button -->
  <div v-if="props.selectMap" class="flex flex-col gap-2 absolute top-6 right-6 z-10">
    <MapCreate />
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
