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
import {toast} from 'vue-sonner'; // Import useToast

// Initialize toast

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Detections', href: '/detections' },
];

interface Detection {
  id: number; // Internal DB ID for your Laravel backend
  external_api_id: string | null;
  external_api_type: string | null;
  api_id?: string | null; // From Flask if you added it
  api_type?: string | null; // From Flask if you added it
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
}

interface LaravelPagination<T> {
  current_page: number; data: T[]; first_page_url: string; from: number | null;
  last_page: number; last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null; path: string; per_page: number;
  prev_page_url: string | null; to: number | null; total: number;
}

const isLoading = ref(true);
const isPolling = ref(false);
let pollingIntervalId: number | undefined = undefined;
const POLLING_INTERVAL_MS = 3000;
const isMonitoringActive = ref(false); // New state for monitoring control

const detections = ref<Detection[]>([]);
const searchQuery = ref('');
const backendPaginationData = ref<Omit<LaravelPagination<any>, 'data'>>({
  current_page: 1, last_page: 1, per_page: 10, total: 0, from: null, to: null,
  first_page_url: '', last_page_url: '', links: [], next_page_url: null, path: '', prev_page_url: null,
});
const tablePagination = ref<PaginationState>({ pageIndex: 0, pageSize: 10 });

// --- Toast and Action Confirmations (Optional, but good UX) ---
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

const showDeleteConfirmDialog = ref(false);
const detectionToDelete = ref<Detection | null>(null);

function confirmDeleteDetection(detection: Detection) {
  detectionToDelete.value = detection;
  showDeleteConfirmDialog.value = true;
}
// --- End Toast ---


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
  columnHelper.display({ // New column for actions
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => h(
        Button,
        {
          variant: 'destructive',
          size: 'sm',
          onClick: () => confirmDeleteDetection(row.original),
        },
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

function startMonitoring() {
  if (POLLING_INTERVAL_MS > 0 && !pollingIntervalId) {
    console.warn(`External API polling starting: every ${POLLING_INTERVAL_MS / 1000}s.`);
    pollingIntervalId = window.setInterval(pollExternalAPIAndStore, POLLING_INTERVAL_MS);
    isMonitoringActive.value = true;
    // Use vue-sonner's toast.info() or toast() for default
    toast.info("Monitoring Started", { // Or just toast("Monitoring Started", { ... })
      description: `Checking for new detections every ${POLLING_INTERVAL_MS / 1000}s.`,
    });
  }
}
function stopMonitoring() {
  if (pollingIntervalId !== undefined) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = undefined;
    isMonitoringActive.value = false;
    console.log('External API polling stopped.');
    toast.info("Monitoring Stopped", { // Or just toast("Monitoring Stopped", { ... })
      description: "No longer checking for new detections automatically.",
    });
  }
}

function toggleMonitoring() {
  if (isMonitoringActive.value) {
    stopMonitoring();
  } else {
    startMonitoring();
  }
}


async function pollExternalAPIAndStore() {
  if (isPolling.value) return;
  isPolling.value = true;

  const API_URL = 'https://straysafe.me/checknewimage'; // Or your local Flask URL

  try {
    const response = await axios.get(API_URL);
    const animalData = response.data;

    // Ensure your Flask API returns 'api_id' and 'api_type' (or similar)
    if (animalData && Object.keys(animalData).length > 0 && animalData.api_id && animalData.api_type) {
      console.log('Poll: New data received from /checknewimage:', animalData);

      const payload = {
        external_api_id: String(animalData.api_id),
        external_api_type: animalData.api_type,
        breed: animalData.breed || null,
        contact_number: animalData.contact_number === 'none' ? null : (animalData.contact_number || null),
        frame_base64: animalData.detected_image_base64 || animalData.frame_base64 || null,
        reg_base64: animalData.registered_image_base64 || animalData.reg_base64 || null,
        has_leash: typeof animalData.has_leash === 'boolean' ? animalData.has_leash : null,
        is_registered: typeof animalData.is_registered === 'boolean' ? animalData.is_registered : null,
        leash_color: animalData.leash_color === 'none' ? null : (animalData.leash_color || null),
        pet_name: animalData.pet_name === 'none' ? null : (animalData.pet_name || null),
        pet_type: animalData.pet_type || animalData.api_type,
      };

      try {
        const backendResponse = await axios.post('/animal-detections', payload);
        let refreshedList = false;

        if (backendResponse.status === 201) {
          console.log('Poll: New detection created in backend.');
          toast.success("New Detection Saved!", {
            description: `Pet: ${payload.pet_name || payload.external_api_id}`,
          });
          refreshedList = true;
        } else if (backendResponse.status === 200) {
          console.log('Poll: Existing detection data processed/updated in backend.');
          // Decide if a toast is needed for updates
          refreshedList = true;
        }

        if (refreshedList) {
          await loadDetectionsFromBackend();
        }
      } catch (postError: any) {
        console.error('Poll: Failed POST to backend:', postError.response?.data || postError.message, 'Payload:', payload);
        toast.error("Error Saving Detection", {
          description: postError.response?.data?.message || postError.message,
        });
      }
    } else {
      // console.log('Poll: No new data or invalid/incomplete data from /checknewimage. Data:', animalData);
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

async function loadDetectionsFromBackend() {
  //isLoading.value = true; // Can be used if you want a spinner for main list reloads too
  try {
    const response = await axios.get<LaravelPagination<any>>('/animal-detections', {
      params: {
        page: tablePagination.value.pageIndex + 1,
        per_page: tablePagination.value.pageSize,
      },
    });
    const { data, ...paginationInfo } = response.data;
    detections.value = data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      external_api_id: item.external_api_id || null,
      external_api_type: item.external_api_type || null,
      // If Flask added api_id and api_type, map them here too if needed for display elsewhere
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
    toast.error("Error Loading Detections", {
      description: "Could not fetch the list of detections.",
    });
  } finally {
    //isLoading.value = false;
  }
}

async function deleteDetection(detectionId: number) {
  console.log(`Attempting to delete detection with ID: ${detectionId}`);
  try {
    // Your backend API endpoint for DELETE is typically `/animal-detections/{id}`
    await axios.delete(`/animal-detections/${detectionId}`);
    toast.success("Detection Deleted", { // Or just toast("Detection Deleted", { ... })
      description: `Detection ID ${detectionId} has been removed.`,
    });

    // Refresh the list:
    // Option A: Simple reload of current page
    await loadDetectionsFromBackend();

    // Option B: More sophisticated (remove from local array, handle pagination if last item on page)
    // detections.value = detections.value.filter(d => d.id !== detectionId);
    // backendPaginationData.value.total--;
    // // Potentially adjust current page if it becomes empty, etc.
    // if (detections.value.length === 0 && backendPaginationData.value.current_page > 1) {
    //    tablePagination.value.pageIndex--; // Go to previous page
    //    await loadDetectionsFromBackend();
    // } else if (detections.value.length === 0 && backendPaginationData.value.total === 0) {
    //    // List is now completely empty
    // }

  } catch (error: any) {
    console.error(`Error deleting detection ${detectionId}:`, error.response?.data || error.message);
    toast.error("Error Deleting Detection", {
      description: error.response?.data?.message || "Could not delete the detection.",
    });
  } finally {
    showDeleteConfirmDialog.value = false;
    detectionToDelete.value = null;
  }
}


onMounted(async () => {
  isLoading.value = true;
  await loadDetectionsFromBackend();
  isLoading.value = false;

  // Decide if monitoring should start automatically or be user-initiated
  // For example, start it by default:
  startMonitoring();
});

onUnmounted(() => {
  stopMonitoring(); // Ensure polling stops when component is unmounted
});

// For card pagination (assuming you want to keep client-side pagination for cards for now)
const currentCardPage = ref(1); // Keep this if you use client-side pagination for cards
const cardsPerPage = 8; // Example

const totalCardPages = computed(() => {
  return Math.ceil(filteredDetections.value.length / cardsPerPage);
});

const paginatedCards = computed(() => {
  const start = (currentCardPage.value - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  return filteredDetections.value.slice(start, end);
});

const getPageNumbers = computed(() => {
    // ... (your existing complex pagination logic for cards) ...
    // This example is simplified; adapt your existing logic
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

// For rendering `h` in table cell
import { h } from 'vue'

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
                     <Card v-if="animal.frame_base64 && animal.reg_base64" class="h-full flex flex-col border-green-500 border-2 relative group">
                        <CardHeader class="pb-2">
                          <CardTitle class="text-center text-base sm:text-lg text-green-700 flex items-center justify-center gap-2">
                            <Icon name="CheckCircle2" class="h-6 w-6" /> Potential Match!
                          </CardTitle>
                        </CardHeader>
                        <CardContent class="flex-grow flex flex-col gap-2">
                          <!-- ... existing content ... -->
                          <div class="text-center">
                            <Badge :variant="animal.has_leash === true ? 'default' : 'destructive'">
                              {{ animal.has_leash === true ? 'Collar/Leashed' : 'No Collar/Leash' }}
                            </Badge>
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
                            <p><strong>Registered:</strong> {{ animal.is_registered ? 'Yes' : 'No' }}</p>
                            <p v-if="animal.contact_number"><strong>Contact:</strong> {{ animal.contact_number }}</p>
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
                      <!-- Card for Single Detection (Not a Match) -->
                      <CardAnimal
                        v-else
                        :title="animal.pet_type ? animal.pet_type.toUpperCase() : 'UNKNOWN TYPE'"
                        :imagelink="animal.frame_base64 || animal.reg_base64 || placeholderImage"
                        :description="`Breed: ${animal.breed || 'N/A'}${animal.pet_name ? ', Name: ' + animal.pet_name : ''}`"
                        :isStray="animal.is_registered === false && !animal.contact_number && !animal.pet_name"
                        :hasOwnerMatch="!!animal.contact_number"
                        :hasLeash="animal.has_leash"
                        :leashColor="animal.leash_color"
                        :time="animal.timestamp"
                        @delete="() => confirmDeleteDetection(animal)"
                        class="h-auto min-h-[280px] 2xl:min-h-[320px] relative group"
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