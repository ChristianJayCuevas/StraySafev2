<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref, onMounted, onBeforeUnmount } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import { Card } from '@/components/ui/card'
import Map from '@/components/map/Map.vue'
import CardData from '@/components/CardData.vue'
import MapControls from '@/components/map/MapControls.vue'
import { Skeleton } from '@/components/ui/skeleton'
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Stray Map',
        href: '/straymap',
    },
];

const isDrawing = ref(false)
const isLoading = ref(true)
const stats = ref({
  camera_pins: 0,
  animal_pins: 0,
  total_area: 0
});

// Reactive state to track processed animal IDs to avoid duplicates
const processedAnimalIds = ref(new Set());
const isPolling = ref(false);
const pollingInterval = ref(null);
const pollingStatus = ref('Idle');
const errorMessage = ref('');

const fetchStats = async () => {
  try {
    const response = await axios.get('/stats/summary');
    stats.value = response.data;
  } catch (error) {
    console.error('Error fetching stats:', error);
  }
};

function updateProcessedIds(id) {
  processedAnimalIds.value.add(id);
  localStorage.setItem('processedAnimalIds', 
    JSON.stringify([...processedAnimalIds.value]));
}

/**
 * Fetches animal detection data and posts it to the animal pins endpoint
 * @returns {Promise<void>}
 */
async function postDetectedAnimalsToAnimalPins() {
  try {
    pollingStatus.value = 'Fetching data...';
    errorMessage.value = '';
    
    console.log('Starting animal detection polling...'); // Debug log
    
    // Step 1: Get existing animal pins from your database
    const existingPinsResponse = await axios.get('/animalpins2');
    const existingPins = existingPinsResponse.data;
    
    // Create a map of existing pins by their original detection ID
    const existingPinMap = {};
    for (const pin of existingPins) {
      if (pin.detection_id) {
        existingPinMap[pin.detection_id] = true;
      }
    }
    
    // Step 2: Get detected animals from the API
    const detectionResponse = await axios.get('/animal-detections');
    console.log('Detection response:', detectionResponse.data); // Debug log

    // Check for paginated response structure (data.data) or direct array (detected_animals)
    let detectedAnimals = null;
    if (detectionResponse.data && detectionResponse.data.data) {
      // Paginated response structure
      detectedAnimals = detectionResponse.data.data;
    } else if (detectionResponse.data && detectionResponse.data.detected_animals) {
      // Direct response structure
      detectedAnimals = detectionResponse.data.detected_animals;
    }

    if (detectedAnimals && detectedAnimals.length > 0) {
      let newAnimalsCount = 0;
      let failedAnimals = 0;
      let skipCount = 0;

      // Use plain object for tracking
      const uniqueAnimalStreamCombos = {}; // Key: `${animal_id}_${stream_id}` → value: timestamp

      const sortedAnimals = [...detectedAnimals].sort((a, b) => {
        return new Date(a.timestamp) - new Date(b.timestamp);
      });

      console.log(`Processing ${sortedAnimals.length} detected animals...`); // Debug log

      for (const animal of sortedAnimals) {
        const animalStreamKey = `${animal.animal_id}_${animal.stream_id}`;
        
        // Skip if we've already processed this detection in a previous session
        if (existingPinMap[animal.id]) {
          skipCount++;
          continue;
        }

        // Skip if we've processed this detection in the current session
        if (processedAnimalIds.value.has(animal.id)) {
          skipCount++;
          continue;
        }

        // Time-based deduplication for the same animal at the same camera
        if (uniqueAnimalStreamCombos.hasOwnProperty(animalStreamKey)) {
          const lastTimestamp = uniqueAnimalStreamCombos[animalStreamKey];
          const currentTimestamp = new Date(animal.timestamp);
          const lastDate = new Date(lastTimestamp);
          const timeDiffInSeconds = Math.abs((currentTimestamp - lastDate) / 1000);

          if (timeDiffInSeconds <= 20) {
            processedAnimalIds.value.add(animal.id);
            skipCount++;
            continue;
          }
        }

        try {
          await axios.post('/animalpins', {
            animal_type: animal.pet_type,
            stray_status: animal.is_registered,
            camera: animal.rtsp_url,
            breed: animal.breed,
            collar: animal.has_leash,
          });

          uniqueAnimalStreamCombos[animalStreamKey] = animal.timestamp;
          processedAnimalIds.value.add(animal.id);
          updateProcessedIds(animal.id); // Save to localStorage
          newAnimalsCount++;
        } catch (animalError) {
          console.error(`Error posting animal ${animal.id}:`, animalError);
          failedAnimals++;
        }
      }

      // Step 4: Optionally, update stats after processing
      if (newAnimalsCount > 0) {
        await fetchStats();
      }

      pollingStatus.value = `Processed ${newAnimalsCount} new animals` +
        (skipCount > 0 ? ` (${skipCount} skipped as duplicates)` : '') +
        (failedAnimals > 0 ? ` (${failedAnimals} failed)` : '');
        
      console.log(pollingStatus.value); // Debug log
    } else {
      pollingStatus.value = 'No detected animals found in the API response';
      console.log('No detected animals in response'); // Debug log
    }
  } catch (error) {
    console.error('Error fetching detected animals:', error);
    errorMessage.value = `Error: ${error.message || 'Unknown error occurred'}`;
    pollingStatus.value = 'Error occurred while fetching data';
  }
}

function startPolling() {
  if (isPolling.value) {
    console.log('Polling already active, skipping start');
    return;
  }
  
  console.log('Starting polling...'); // Debug log
  isPolling.value = true;
  pollingStatus.value = 'Starting polling...';
  
  // Run immediately on start
  postDetectedAnimalsToAnimalPins();
  
  // Then set up interval for every 10 seconds
  pollingInterval.value = setInterval(() => {
    console.log('Polling interval triggered'); // Debug log
    postDetectedAnimalsToAnimalPins();
  }, 10000); // 10 seconds
  
  console.log('Polling started with interval ID:', pollingInterval.value);
}

// Stop polling function
function stopPolling() {
  if (!isPolling.value) return;
  
  console.log('Stopping polling...'); // Debug log
  clearInterval(pollingInterval.value);
  pollingInterval.value = null;
  isPolling.value = false;
  pollingStatus.value = 'Polling stopped';
}

// Component lifecycle hooks
onBeforeUnmount(() => {
  console.log('Component unmounting, stopping polling'); // Debug log
  stopPolling(); // Clean up when component unmounts
});

onMounted(async () => {
  console.log('Component mounted'); // Debug log
  
  // Load processed IDs from localStorage
  const savedIds = localStorage.getItem('processedAnimalIds');
  if (savedIds) {
    try {
      // Convert the array back to a Set
      processedAnimalIds.value = new Set(JSON.parse(savedIds));
      console.log(`Loaded ${processedAnimalIds.value.size} processed IDs from localStorage`);
    } catch (error) {
      console.error('Error parsing processedAnimalIds from localStorage:', error);
      // Reset if there's an error
      localStorage.removeItem('processedAnimalIds');
    }
  }
  
  // Fetch initial stats
  await fetchStats();
  
  // Start polling after a short delay to ensure everything is initialized
  setTimeout(() => {
    startPolling();
  }, 1000);
  
  // Set loading to false after delay
  setTimeout(() => {
    isLoading.value = false
  }, 2000);
});
</script>

<template>
    <Head title="StrayMap" />
    <AppLayout :breadcrumbs="breadcrumbs">
        <!-- Debug info -->
       
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
                <CardData title="Camera Pins" :value="stats.camera_pins" icon="scanEye"
                    description="Total number of camera pins" />
                <CardData title="Animal Pins" :value="stats.animal_pins" icon="mapPinned"
                    description="Total number of animal pins" />
                <CardData title="Total Area" :value="stats.total_area" icon="map"
                    description="Total number of user drawn areas" />
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