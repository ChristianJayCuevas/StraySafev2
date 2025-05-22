<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import CardAnimal from '@/components/CardAnimal.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/Icon.vue'
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import {
  createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useVueTable, type PaginationState,
} from '@tanstack/vue-table';
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationPrevious, PaginationNext,
} from '@/components/ui/pagination';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {toast} from 'vue-sonner';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Detections', href: '/detections' },
];

interface Detection {
  id: number; // Internal DB ID for your Laravel backend
  external_api_id: string | null;
  external_api_type: string | null;
  api_id?: string | null;
  api_type?: string | null;
  breed: string | null;
  contact_number: string | null;
  frame_base64: string | null;
  has_leash: boolean | null;
  is_registered: boolean | null;
  leash_color: string | null;
  pet_name: string | null;
  pet_type: string | null;
  reg_base64: string | null;
  timestamp: string;
  external_data_timestamp: string | null;
  // For notification context
  latitude?: string | null;
  longitude?: string | null;
  camera_name?: string | null;
}

// NEW: Interface for Registered Pet
interface RegisteredPet {
  id: number;         // Registered Pet's own ID
  user_id: number;    // Owner's User ID
  pet_name: string;
  breed: string;
  pet_type: string; // e.g., 'dog', 'cat'
  // ... any other relevant fields from your registered_pets table
}

interface LaravelPagination<T> {
  current_page: number; data: T[]; first_page_url: string; from: number | null;
  last_page: number; last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null; path: string; per_page: number;
  prev_page_url: string | null; to: number | null; total: number;
}
const notifiedMatches = ref<Set<string>>(new Set());
const isLoading = ref(true);
const isPolling = ref(false);
let pollingIntervalId: number | undefined = undefined;
const POLLING_INTERVAL_MS = 3000; // Keep it higher for production (e.g., 10-30 seconds)
const isMonitoringActive = ref(false);

const detections = ref<Detection[]>([]);
const registeredPets = ref<RegisteredPet[]>([]); // NEW: Store registered pets
const isLoadingRegisteredPets = ref(true);      // NEW: Loading state for registered pets

const searchQuery = ref('');
const backendPaginationData = ref<Omit<LaravelPagination<any>, 'data'>>({
  current_page: 1, last_page: 1, per_page: 10, total: 0, from: null, to: null,
  first_page_url: '', last_page_url: '', links: [], next_page_url: null, path: '', prev_page_url: null,
});
const tablePagination = ref<PaginationState>({ pageIndex: 0, pageSize: 10 });

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const showDeleteConfirmDialog = ref(false);
const detectionToDelete = ref<Detection | null>(null);

function confirmDeleteDetection(detection: Detection) {
  detectionToDelete.value = detection;
  showDeleteConfirmDialog.value = true;
}

function formatBase64Image(base64String: string | null, imageTypeIfRaw: string = 'png'): string | null {
  if (!base64String) return null;
  if (base64String.startsWith('data:image')) return base64String;
  return `data:image/${imageTypeIfRaw};base64,${base64String}`;
}

function formatBackendTimestamp(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return 'N/A';
  try {
    const date = new Date(isoTimestamp);
    const optionsDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const optionsTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    return `${date.toLocaleDateString(undefined, optionsDate)}, ${date.toLocaleTimeString(undefined, optionsTime)}`;
  } catch (e) {
    return isoTimestamp;
  }
}

const filteredDetections = computed(() => {
  if (!searchQuery.value) return detections.value;
  const query = searchQuery.value.toLowerCase();
  return detections.value.filter(animal =>
    (animal.pet_type && animal.pet_type.toLowerCase().includes(query)) ||
    (animal.breed && animal.breed.toLowerCase().includes(query)) ||
    (animal.pet_name && animal.pet_name.toLowerCase().includes(query)) ||
    (animal.leash_color && animal.leash_color.toLowerCase().includes(query)) ||
    (animal.contact_number && animal.contact_number.toLowerCase().includes(query))
  );
});

const columnHelper = createColumnHelper<Detection>();
const columns = [
  columnHelper.accessor('pet_type', { header: 'Pet Type', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('breed', { header: 'Breed', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('pet_name', { header: 'Pet Name', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('has_leash', { header: 'Has Leash?', cell: info => info.getValue() === null ? 'N/A' : (info.getValue() ? 'Yes' : 'No') }),
  columnHelper.accessor('is_registered', { header: 'Registered?', cell: info => info.getValue() === null ? 'N/A' : (info.getValue() ? 'Yes' : 'No') }),
  columnHelper.accessor('timestamp', { header: 'Time Stored', cell: info => info.getValue() || 'N/A' }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => h(
        Button,
        { variant: 'destructive', size: 'sm', onClick: () => confirmDeleteDetection(row.original) },
        () => [h(Icon, { name: 'Trash2', class: 'h-4 w-4 mr-1' }), 'Delete']
      ),
  }),
];

const table = useVueTable({
  get data() { return filteredDetections.value; },
  columns,
  getRowId: row => String(row.id),
  manualPagination: true,
  pageCount: computed(() => backendPaginationData.value.last_page),
  state: {
    get pagination() { return tablePagination.value; },
    get globalFilter() { return searchQuery.value; },
  },
  onPaginationChange: (updater) => {
    const newPagination = typeof updater === 'function' ? updater(tablePagination.value) : updater;
    tablePagination.value = newPagination;
    loadDetectionsFromBackend();
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});

watch(searchQuery, () => { /* Client-side search on current page */ });


// --- Registered Pets Fetching ---
async function fetchRegisteredPets() {
  isLoadingRegisteredPets.value = true;
  try {
    // Define a type for the expected backend response structure
    interface RegisteredPetsApiResponse {
      status: string;
      data: RegisteredPet[]; // The array of pets
    }

    // Use this type with axios.get
    const response = await axios.get<RegisteredPetsApiResponse>('/api/mobileregisteredanimals'); // Adjust endpoint if needed

    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      registeredPets.value = response.data.data; // Access the nested 'data' array
      console.log('Registered pets loaded:', registeredPets.value.length); // Now this will be correct
    } else {
      console.error('Failed to fetch registered pets or unexpected response structure:', response.data);
      toast.error("Error Loading Registered Pets", { description: "Received an invalid response from the server." });
      registeredPets.value = [];
    }
  } catch (error) {
    console.error('Error fetching registered pets:', error);
    toast.error("Error Loading Registered Pets", { description: "Could not fetch the list of registered pets." });
    registeredPets.value = [];
  } finally {
    isLoadingRegisteredPets.value = false;
  }
}
function isActualRegisteredMatch(detectedAnimal: Detection): RegisteredPet | undefined {
  if (!detectedAnimal.pet_name || !detectedAnimal.breed) {
    return undefined; // Cannot match without these details
  }
  if (isLoadingRegisteredPets.value || registeredPets.value.length === 0) {
      return undefined; // Don't attempt to match if registered pets aren't loaded
  }

  const detectedNameLower = detectedAnimal.pet_name.toLowerCase().trim();
  const detectedBreedLower = detectedAnimal.breed.toLowerCase().trim();


  return registeredPets.value.find(regPet =>
    regPet.pet_name.toLowerCase().trim() === detectedNameLower &&
    regPet.breed.toLowerCase().trim() === detectedBreedLower
  );
}
// --- Notification Sending ---
async function sendPetMatchNotification(userId: number, detectedAnimal: Detection, matchedRegisteredPet: RegisteredPet) {
  const NOTIFICATION_URL = 'https://straysafe.me/send-notification';

  // ---- START Notification Limiting Logic ----
  // Create a unique key for this specific match (detected external ID + registered pet ID)
  // Ensure detectedAnimal.external_api_id is reliably populated. If not, use another unique ID from detectedAnimal.
  const matchKey = `${detectedAnimal.external_api_id || detectedAnimal.pet_name}-${matchedRegisteredPet.id}`;

  if (notifiedMatches.value.has(matchKey)) {
    console.log(`Notification for matchKey ${matchKey} already sent this session. Skipping.`);
    return; // Already notified for this specific match in this session
  }
  // ---- END Notification Limiting Logic ----

  let bodyMessage = `A pet matching the description of your registered pet, ${matchedRegisteredPet.pet_name} (${matchedRegisteredPet.breed}), has been detected.\n`;
  // ... (rest of bodyMessage construction) ...

  const payload = {
    user_id: 1, // Use the actual user_id from matchedRegisteredPet.user_id
    title: `Potential Match Found for Your Pet: ${matchedRegisteredPet.pet_name}!`,
    body: bodyMessage,
    action: '/notifications',
    image: detectedAnimal.frame_base64 || detectedAnimal.reg_base64 || 'https://straysafe.me/images/default-pet-notification.png',
  };

  console.log('Sending notification payload:', payload);

  try {
    const response = await axios.post(NOTIFICATION_URL, payload);
    console.log('Notification sent successfully:', response.data);
    toast.success("Match Notification Sent!", { description: `Owner of ${matchedRegisteredPet.pet_name} has been notified.` });
    notifiedMatches.value.add(matchKey); // Add to set after successful send
  } catch (error: any) {
    // ... (error handling) ...
  }
}


// --- Enhanced Polling Logic ---
async function pollExternalAPIAndStore() {
  if (isPolling.value) return;
  if (isLoadingRegisteredPets.value) {
    console.log('Polling paused: Registered pets data is still loading.');
    return;
  }
  isPolling.value = true;

  const API_URL = 'https://straysafe.me/checknewimage';

  try {
    const response = await axios.get<Detection>(API_URL); // Assume animalData matches Detection structure
    const detectedAnimalData = response.data;

    // Using pet_name and pet_type from Flask response as the primary identifiers for a detection
    // This was the condition you had: animalData.pet_name && animalData.pet_type
    // Let's ensure Flask provides these consistently.
    if (detectedAnimalData && Object.keys(detectedAnimalData).length > 0 && detectedAnimalData.pet_name && detectedAnimalData.pet_type) {
      console.log('Poll: New detection received:', detectedAnimalData);

      // Prepare payload for saving the detection to your Laravel backend
      const detectionPayload = {
        external_api_id: String(detectedAnimalData.pet_name), // Or use a more unique ID from Flask if available
        external_api_type: detectedAnimalData.pet_type,
        breed: detectedAnimalData.breed || null,
        contact_number: detectedAnimalData.contact_number === 'none' ? null : (detectedAnimalData.contact_number || null),
        frame_base64: detectedAnimalData.detected_image_base64 || detectedAnimalData.frame_base64 || null,
        reg_base64: detectedAnimalData.registered_image_base64 || detectedAnimalData.reg_base64 || null,
        has_leash: typeof detectedAnimalData.has_leash === 'boolean' ? detectedAnimalData.has_leash : null,
        is_registered: typeof detectedAnimalData.is_registered === 'boolean' ? detectedAnimalData.is_registered : null,
        leash_color: detectedAnimalData.leash_color === 'none' ? null : (detectedAnimalData.leash_color || null),
        pet_name: detectedAnimalData.pet_name === 'none' ? null : (detectedAnimalData.pet_name || null), // This is the detected pet's name
        pet_type: detectedAnimalData.pet_type,
        // Include location data if Flask provides it
        // latitude: detectedAnimalData.latitude || null,
        // longitude: detectedAnimalData.longitude || null,
        // camera_name: detectedAnimalData.camera_name || null,
      };

      // Save the detection to your backend
      try {
        const backendResponse = await axios.post('/animal-detections', detectionPayload);
        let refreshedList = false;
        if (backendResponse.status === 201 || backendResponse.status === 200) {
          if(backendResponse.status === 201) {
            toast.success("New Detection Saved!", { description: `Pet: ${detectionPayload.pet_name || detectionPayload.external_api_id}` });
          }
          refreshedList = true;
        }
        if (refreshedList) {
          await loadDetectionsFromBackend(); // Refresh the displayed list of detections
        }
      } catch (postError: any) {
        console.error('Poll: Failed POST to backend /animal-detections:', postError.response?.data || postError.message, 'Payload:', detectionPayload);
        toast.error("Error Saving Detection", { description: postError.response?.data?.message || postError.message });
      }
      // ---- NEW: Check for match with registered pets ----
      if (detectedAnimalData.pet_name && detectedAnimalData.breed) {
        const detectedNameLower = detectedAnimalData.pet_name.toLowerCase();
        const detectedBreedLower = detectedAnimalData.breed.toLowerCase();
       

        for (const regPet of registeredPets.value) {
          if (
            regPet.pet_name.toLowerCase() === detectedNameLower &&
            regPet.breed.toLowerCase() === detectedBreedLower 
            // Optional: match pet_type too
          ) {
            console.log(`MATCH FOUND: Detected ${detectedAnimalData.pet_name} (${detectedAnimalData.breed}) matches registered ${regPet.pet_name} (${regPet.breed}) owned by user ${regPet.user_id}`);
            // Send notification
            await sendPetMatchNotification(regPet.user_id, detectedAnimalData, regPet);
            // Optional: Break if you only want to notify for the first match
            // break;
          }
        }
      }

    } else {
       console.log('Poll: No new valid data from /checknewimage. Data:', detectedAnimalData);
    }
  } catch (error: any) {
    if (error.response && error.response.status === 204) {
      // console.log('Poll: No new image data (204 No Content).');
    } else {
      console.warn(`Poll: Failed to fetch from /checknewimage:`, error.response?.status, error.message);
    }
  } finally {
    isPolling.value = false;
  }
}


function startMonitoring() {
  if (POLLING_INTERVAL_MS > 0 && !pollingIntervalId) {
    if (isLoadingRegisteredPets.value) {
      toast.info("Hold on...", { description: "Loading registered pet data before starting monitoring." });
      // Wait for registered pets to load, then start.
      // This could be improved with a watcher or promise chain.
      const unwatch = watch(isLoadingRegisteredPets, (newValue) => {
        if (!newValue) {
          unwatch(); // Stop watching once loaded
          console.warn(`External API polling starting: every ${POLLING_INTERVAL_MS / 1000}s.`);
          pollingIntervalId = window.setInterval(pollExternalAPIAndStore, POLLING_INTERVAL_MS);
          isMonitoringActive.value = true;
          toast.info("Monitoring Started", { description: `Checking for new detections every ${POLLING_INTERVAL_MS / 1000}s.`});
        }
      });
    } else {
        console.warn(`External API polling starting: every ${POLLING_INTERVAL_MS / 1000}s.`);
        pollingIntervalId = window.setInterval(pollExternalAPIAndStore, POLLING_INTERVAL_MS);
        isMonitoringActive.value = true;
        toast.info("Monitoring Started", { description: `Checking for new detections every ${POLLING_INTERVAL_MS / 1000}s.`});
    }
  }
}
function stopMonitoring() {
  if (pollingIntervalId !== undefined) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = undefined;
    isMonitoringActive.value = false;
    console.log('External API polling stopped.');
    toast.info("Monitoring Stopped", { description: "No longer checking for new detections automatically." });
  }
}

function toggleMonitoring() {
  if (isMonitoringActive.value) {
    stopMonitoring();
  } else {
    startMonitoring();
  }
}

async function loadDetectionsFromBackend() {
  try {
    const response = await axios.get<LaravelPagination<any>>('/animal-detections', {
      params: { page: tablePagination.value.pageIndex + 1, per_page: tablePagination.value.pageSize },
    });
    const { data, ...paginationInfo } = response.data;
    detections.value = data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      external_api_id: item.external_api_id || null,
      external_api_type: item.external_api_type || null,
      api_id: item.api_id || null,
      api_type: item.api_type || null,
      timestamp: formatBackendTimestamp(item.detected_at),
      external_data_timestamp: formatBackendTimestamp(item.external_data_updated_at),
      frame_base64: formatBase64Image(item.frame_base64, item.pet_type === 'dog' ? 'jpeg' : 'png'),
      reg_base64: formatBase64Image(item.reg_base64, item.pet_type === 'dog' ? 'jpeg' : 'png'),
    }));
    backendPaginationData.value = paginationInfo;
  } catch (error) {
    console.error('Error fetching main list from backend:', error);
    detections.value = [];
    backendPaginationData.value = { ...backendPaginationData.value, total:0, last_page:1, current_page:1 };
    toast.error("Error Loading Detections", { description: "Could not fetch the list of detections." });
  }
}

async function deleteDetection(detectionId: number) {
  console.log(`Attempting to delete detection with ID: ${detectionId}`);
  try {
    await axios.delete(`/animal-detections/${detectionId}`);
    toast.success("Detection Deleted", { description: `Detection ID ${detectionId} has been removed.` });
    await loadDetectionsFromBackend();
  } catch (error: any) {
    console.error(`Error deleting detection ${detectionId}:`, error.response?.data || error.message);
    toast.error("Error Deleting Detection", { description: error.response?.data?.message || "Could not delete the detection." });
  } finally {
    showDeleteConfirmDialog.value = false;
    detectionToDelete.value = null;
  }
}

onMounted(async () => {
  isLoading.value = true;
  // Fetch both detections and registered pets in parallel
  await Promise.all([
    loadDetectionsFromBackend(),
    fetchRegisteredPets() // Fetch registered pets on mount
  ]);
  isLoading.value = false; // Set to false after both are done

  startMonitoring(); // Start monitoring after initial data is loaded
});

onUnmounted(() => {
  stopMonitoring();
});

const currentCardPage = ref(1);
const cardsPerPage = 8;

const totalCardPages = computed(() => {
  return Math.ceil(filteredDetections.value.length / cardsPerPage);
});

const paginatedCards = computed(() => {
  const start = (currentCardPage.value - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  return filteredDetections.value.slice(start, end);
});

const getPageNumbers = computed(() => {
    const total = totalCardPages.value;
    const current = currentCardPage.value;
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
        range.push(i);
    }
    if (current - delta > 2) range.unshift('...');
    if (current + delta < total - 1) range.push('...');
    range.unshift(1);
    if (total > 1) range.push(total);
    return range.filter((item, index, self) => item !== '...' || (item === '...' && self[index-1] !== '...'));
});

const placeholderImage = 'https://placehold.co/600x400/4f6642/FFFFFF/png?text=No+Image';
import { h } from 'vue';
</script>


<template>
  <Head title="Detections" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="container mx-auto py-6 px-4">

      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-semibold">Detections</h1>
        <Button @click="toggleMonitoring" :variant="isMonitoringActive ? 'destructive' : 'default'">
          <Icon :name="isMonitoringActive ? 'SquareActivity' : 'Play'" class="h-5 w-5 mr-2" />
          {{ isMonitoringActive ? 'Stop Monitoring' : 'Start Monitoring' }}
        </Button>
      </div>

       <!-- Polling Warning Banner -->
      <div v-if="isMonitoringActive && POLLING_INTERVAL_MS > 0 && POLLING_INTERVAL_MS <= 5000"
           class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
        <p>
          <Icon name="AlertTriangle" class="inline h-5 w-5 mr-2" />
          <strong class="font-semibold">Aggressive Polling Active:</strong> External API is being checked every {{ POLLING_INTERVAL_MS / 1000 }} second(s).
        </p>
      </div>

      <div class="flex flex-col gap-6">
        <div v-if="isLoading" class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>

        <div v-else>
           <Tabs default-value="Cards">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <TabsList>
                <TabsTrigger value="Cards"> <Icon name="Grid2x2" /> </TabsTrigger>
                <TabsTrigger value="Table"> <Icon name="TableProperties" /> </TabsTrigger>
              </TabsList>
              <Input v-model="searchQuery" placeholder="Search detections..." class="w-full sm:w-64" />
            </div>

            <TabsContent value="Cards">
              <div v-if="paginatedCards.length === 0" class="flex justify-center items-center h-64">
                <p class="text-muted-foreground">
                    {{ backendPaginationData.total === 0 ? 'No detections in the system.' : 'No detections found matching your criteria on this page.'}}
                </p>
              </div>
              <div v-else>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <template v-for="animal in paginatedCards" :key="animal.id">
                     <!-- Card for Potential Match -->
                     <Card
                        v-if="animal.frame_base64 && animal.reg_base64 && isActualRegisteredMatch(animal)"
                        class="h-full flex flex-col border-green-500 border-2 relative group"
                      >
                        <CardHeader class="pb-2">
                          <CardTitle class="text-center text-base sm:text-lg text-green-700 flex items-center justify-center gap-2">
                            <Icon name="CheckCircle2" class="h-6 w-6" /> Potential Match!
                          </CardTitle>
                        </CardHeader>
                        <CardContent class="flex-grow flex flex-col gap-2">
                          <!-- ... existing content for matched card ... -->
                          <div class="text-center">
                            <Badge :variant="animal.has_leash === true ? 'default' : 'destructive'">
                              {{ animal.has_leash === true ? 'Collar/Leashed' : 'No Collar/Leash' }}
                            </Badge>
                          </div>
                           <!-- Display owner info if available from the match -->
                          <div v-if="isActualRegisteredMatch(animal)?.user_id" class="text-xs text-center mt-1">
                            Owned by User ID: {{ isActualRegisteredMatch(animal)?.user_id }}
                          </div>
                          <div class="grid grid-cols-2 gap-2 items-start my-1">
                            <div>
                              <p class="text-xs font-semibold text-center mb-1">Detected:</p>
                              <img :src="animal.frame_base64 || placeholderImage" alt="Detected Pet" class="w-full h-auto aspect-square rounded object-contain border p-0.5" />
                            </div>
                            <div>
                              <p class="text-xs font-semibold text-center mb-1">Registered:</p>
                              <img :src="animal.reg_base64 || placeholderImage" alt="Registered Pet" class="w-full h-auto aspect-square rounded object-contain border p-0.5" />
                            </div>
                          </div>
                          <div class="mt-auto pt-2 text-xs border-t">
                            <p v-if="animal.pet_name"><strong>Name:</strong> {{ animal.pet_name }}</p>
                            <p><strong>Type:</strong> {{ animal.pet_type || 'N/A' }}</p>
                            <p><strong>Breed:</strong> {{ animal.breed || 'N/A' }}</p>
                            <p v-if="animal.has_leash === true"><strong>Leash Color:</strong> {{ animal.leash_color || 'Unknown' }}</p>
                            <p><strong>Registered Database Match:</strong> Yes</p>
                            <p v-if="animal.contact_number"><strong>Original Contact (if any):</strong> {{ animal.contact_number }}</p>
                            <p><strong>Time Stored:</strong> {{ animal.timestamp }}</p>
                          </div>
                        </CardContent>
                        <!-- Delete Button Overlay -->
                        <div class="absolute top-2 right-2">
                            <Button @click="confirmDeleteDetection(animal)" variant="destructive" size="icon" class="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Icon name="Trash2" class="h-4 w-4" />
                                <span class="sr-only">Delete Detection</span>
                            </Button>
                        </div>
                      </Card>
                      <!-- Card for Single Detection (Not a confirmed registered match OR missing an image) -->
                      <CardAnimal
                        v-else
                        :id="animal.id" 
                        :title="animal.pet_type ? animal.pet_type.toUpperCase() : 'UNKNOWN TYPE'"
                        :imagelink="animal.frame_base64 || animal.reg_base64 || placeholderImage"
                        :description="`Breed: ${animal.breed || 'N/A'}`"
                        :isStray="animal.is_registered === false && !animal.contact_number && !animal.pet_name" 
                        :hasOwnerMatch="!!isActualRegisteredMatch(animal)" 
                        :hasLeash="animal.has_leash"
                        :leashColor="animal.leash_color"
                        :time="animal.timestamp"
                        @delete="() => confirmDeleteDetection(animal)"
                        class="h-auto min-h-[280px] 2xl:min-h-[320px]"
                      >
                        <!-- Delete Button Overlay for CardAnimal -->
                        <template #actions> <!-- Or add directly if CardAnimal doesn't have a slot -->
                           <div class="absolute top-2 right-2 z-10"> <!-- Ensure z-index if needed -->
                                <Button @click="confirmDeleteDetection(animal)" variant="destructive" size="icon" class="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <Icon name="Trash2" class="h-4 w-4" />
                                    <span class="sr-only">Delete Detection</span>
                                </Button>
                            </div>
                        </template>
                      </CardAnimal>
                  </template>
                </div>
                 <div class="flex justify-center mt-6" v-if="totalCardPages > 1">
                  <Pagination v-slot="{ page }" :total="totalCardPages" :sibling-count="1" show-edges :default-page="currentCardPage" @update:page="(newPage) => currentCardPage = newPage">
                    <PaginationContent class="flex gap-1 sm:gap-2">
                      <PaginationPrevious />
                       <template v-for="(item, index) in page.pages">
                        <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value">
                          <Button class="h-9 w-9 sm:h-10 sm:w-10 text-xs sm:text-sm" :variant="item.value === page.value ? 'default' : 'outline'">
                            {{ item.value }}
                          </Button>
                        </PaginationItem>
                        <PaginationEllipsis v-else :key="item.type" :index="index" class="hidden sm:flex" />
                      </template>
                      <PaginationNext />
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Table">
               <Card>
                <CardHeader> <CardTitle>List of Detected Animals</CardTitle> </CardHeader>
                <CardContent>
                  <div v-if="table.getRowModel().rows.length === 0" class="flex justify-center items-center h-32">
                     <p class="text-muted-foreground">
                        {{ backendPaginationData.total === 0 ? 'No detections in the system.' : 'No detections found matching your criteria on this page.'}}
                     </p>
                  </div>
                  <div v-else>
                    <Table>
                      <TableHeader>
                        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                          <TableHead v-for="header in headerGroup.headers" :key="header.id" class="text-center" :class="{'cursor-pointer': header.column.getCanSort()}" @click="header.column.getToggleSortingHandler()?.($event)">
                            <div class="flex items-center justify-center space-x-1">
                              <span>{{ header.isPlaceholder ? null : header.column.columnDef.header }}</span>
                              <template v-if="header.column.getIsSorted()">
                                <Icon :name="header.column.getIsSorted() === 'desc' ? 'ArrowDown' : 'ArrowUp'" class="h-4 w-4" />
                              </template>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                          <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="text-center">
                            <!-- Custom rendering for action buttons in table -->
                             <template v-if="cell.column.id === 'actions'">
                                <component :is="cell.renderValue()"></component>
                            </template>
                            <template v-else>
                                {{ cell.getValue() }}
                            </template>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                      <TableCaption v-if="backendPaginationData.total > 0">
                        Showing {{ backendPaginationData.from || 0 }} to {{ backendPaginationData.to || 0 }} of {{ backendPaginationData.total }} results.
                        Page {{ backendPaginationData.current_page }} of {{ backendPaginationData.last_page }}.
                      </TableCaption>
                    </Table>
                    <div class="flex items-center justify-between space-x-2 py-4" v-if="table.getPageCount() > 1">
                       <span class="text-sm text-muted-foreground"> Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }} </span>
                      <div class="flex space-x-2">
                        <Button @click="table.previousPage()" :disabled="!table.getCanPreviousPage()" variant="outline" size="sm"> <Icon name="ChevronLeft" class="h-4 w-4 mr-1" /> Previous </Button>
                        <Button @click="table.nextPage()" :disabled="!table.getCanNextPage()" variant="outline" size="sm"> Next <Icon name="ChevronRight" class="h-4 w-4 ml-1" /> </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>

    <!-- AlertDialog for Delete Confirmation -->
    <AlertDialog :open="showDeleteConfirmDialog" @update:open="showDeleteConfirmDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the detection record
            <span v-if="detectionToDelete">
              for {{ detectionToDelete.pet_name || detectionToDelete.pet_type || `ID ${detectionToDelete.id}` }}
            </span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteConfirmDialog = false; detectionToDelete = null;">Cancel</AlertDialogCancel>
          <AlertDialogAction @click="detectionToDelete && deleteDetection(detectionToDelete.id)" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </AppLayout>
</template>