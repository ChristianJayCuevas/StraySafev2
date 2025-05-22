<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import { ref, onMounted, computed, watch, onUnmounted } from 'vue'; // Added onUnmounted
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

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Detections', href: '/detections' },
];

interface Detection {
  id: number; // Internal DB ID
  external_api_id: string | null;   // From external API
  external_api_type: string | null; // From external API
  breed: string | null;
  contact_number: string | null;
  frame_base64: string | null;
  has_leash: boolean | null;
  is_registered: boolean | null;
  leash_color: string | null;
  pet_name: string | null;
  pet_type: string | null; // pet_type from external API data
  reg_base64: string | null;
  timestamp: string; // Formatted detected_at (when our backend first stored it)
  external_data_timestamp: string | null; // Formatted external_data_updated_at
}

interface LaravelPagination<T> {
  current_page: number; data: T[]; first_page_url: string; from: number | null;
  last_page: number; last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null; path: string; per_page: number;
  prev_page_url: string | null; to: number | null; total: number;
}

const isLoading = ref(true); // For initial load of main list
const isPolling = ref(false); // Flag for concurrent polling control
let pollingIntervalId: number | undefined = undefined;
const POLLING_INTERVAL_MS = 3000; // **WARNING: VERY AGGRESSIVE. Change for production!**

const detections = ref<Detection[]>([]);
const searchQuery = ref('');
const backendPaginationData = ref<Omit<LaravelPagination<any>, 'data'>>({
  current_page: 1, last_page: 1, per_page: 10, total: 0, from: null, to: null,
  first_page_url: '', last_page_url: '', links: [], next_page_url: null, path: '', prev_page_url: null,
});
const tablePagination = ref<PaginationState>({ pageIndex: 0, pageSize: 10 });

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
  // ... (filtering logic remains the same, acts on current page data) ...
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
  // Optional: Display external identifiers if useful
  // columnHelper.accessor('external_api_id', { header: 'Ext. ID', cell: info => info.getValue() || 'N/A' }),
  // columnHelper.accessor('external_api_type', { header: 'Ext. Type', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('pet_type', { header: 'Pet Type', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('breed', { header: 'Breed', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('pet_name', { header: 'Pet Name', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('has_leash', { header: 'Has Leash?', cell: info => info.getValue() === null ? 'N/A' : (info.getValue() ? 'Yes' : 'No') }),
  columnHelper.accessor('is_registered', { header: 'Registered?', cell: info => info.getValue() === null ? 'N/A' : (info.getValue() ? 'Yes' : 'No') }),
  columnHelper.accessor('timestamp', { header: 'Time Stored', cell: info => info.getValue() || 'N/A' }),
  // columnHelper.accessor('external_data_timestamp', { header: 'Last Seen Externally', cell: info => info.getValue() || 'N/A' }),
];

const table = useVueTable({ /* ... table config ... */
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
    loadDetectionsFromBackend(); // This reloads the main displayed list
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});

watch(searchQuery, () => { /* Client-side search on current page */ });

async function pollExternalAPIAndStore() {
  if (isPolling.value) {
    return;
  }
  isPolling.value = true;
  // console.log('Polling /checknewimage...');

  const API_URL = 'https://straysafe.me/checknewimage'; // Corrected from API_BASE_URL

  try {
    const response = await axios.get(API_URL);

    // Check if the response contains data.
    // Adjust this condition based on how `/checknewimage` signals "no new data".
    // It might be an empty object, null, an empty array, or a specific status code handled by axios.
    // If axios throws for 204, it would be caught in the catch block.
    const animalData = response.data;

    if (animalData && Object.keys(animalData).length > 0 && animalData.pet_type && animalData.pet_name) { // Basic check for valid data
      // console.log('Poll: New data received from /checknewimage:', animalData);

      // Prepare the payload for your backend
      // Ensure animalData has fields that map to your backend's expectations.
      // 'originalQueryId' and 'originalQueryType' were from the loop,
      // now we use 'id' and 'type' (or similar) directly from the /checknewimage response.
      const payload = {
        external_api_id: String(animalData.pet_name), // Assuming 'id' is the unique identifier
        external_api_type: animalData.pet_type,    // Assuming 'type' is like 'dog' or 'cat'
        breed: animalData.breed || null,
        contact_number: animalData.contact_number === 'none' ? null : (animalData.contact_number || null),
        frame_base64: animalData.detected_image_base64 || animalData.frame_base64 || null, // Prioritize detected_image_base64
        reg_base64: animalData.registered_image_base64 || animalData.reg_base64 || null,
        has_leash: typeof animalData.has_leash === 'boolean' ? animalData.has_leash : null,
        is_registered: typeof animalData.is_registered === 'boolean' ? animalData.is_registered : null,
        leash_color: animalData.leash_color === 'none' ? null : (animalData.leash_color || null),
        pet_name: animalData.pet_name === 'none' ? null : (animalData.pet_name || null),
        pet_type: animalData.pet_type || animalData.type, // Use pet_type if available, fallback to type
      };

      try {
        // Your backend API endpoint for POSTing is '/api/animal-detections'
        const backendResponse = await axios.post('/animal-detections', payload); // Corrected endpoint
        let refreshedList = false;

        if (backendResponse.status === 201) {
          // console.log('Poll: New detection created in backend.');
          refreshedList = true;
        } else if (backendResponse.status === 200) {
          // console.log('Poll: Existing detection data processed/updated in backend.');
          // You might only want to refresh if data *actually* changed.
          // For simplicity, we can refresh, or add more complex logic.
          // For now, let's assume an update might mean a change worth showing.
          refreshedList = true;
        }

        if (refreshedList) {
          // console.log('Poll: Triggering refresh of main detection list.');
          await loadDetectionsFromBackend();
        }
      } catch (postError: any) {
        console.error('Poll: Failed POST to backend:', postError.response?.data || postError.message, 'Payload:', payload);
      }
    } else {
      // console.log('Poll: No new data or invalid data from /checknewimage.');
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
  // console.log(`Loading main list from backend. Page: ${tablePagination.value.pageIndex + 1}, PageSize: ${tablePagination.value.pageSize}`);
  // isLoading.value = true; // This isLoading is for the main list, separate from polling
  try {
    const response = await axios.get<LaravelPagination<any>>('/animal-detections', {
      params: {
        page: tablePagination.value.pageIndex + 1,
        per_page: tablePagination.value.pageSize,
      },
    });
    const { data, ...paginationInfo } = response.data;
    detections.value = data.map((item: any) => ({
      ...item, // Spread all properties from backend
      id: Number(item.id),
      external_api_id: item.external_api_id || null,
      external_api_type: item.external_api_type || null,
      timestamp: formatBackendTimestamp(item.detected_at),
      external_data_timestamp: formatBackendTimestamp(item.external_data_updated_at),
      frame_base64: formatBase64Image(item.frame_base64, item.pet_type === 'dog' ? 'jpeg' : 'png'),
      reg_base64: formatBase64Image(item.reg_base64, item.pet_type === 'dog' ? 'jpeg' : 'png'),
    }));
    backendPaginationData.value = paginationInfo;
  } catch (error) {
    console.error('Error fetching main list from backend:', error);
    detections.value = []; // Reset on error
    backendPaginationData.value = { ...backendPaginationData.value, total:0, last_page:1, current_page:1 };
  } finally {
    // isLoading.value = false;
  }
}

onMounted(async () => {
  isLoading.value = true; // For the very first load
  await loadDetectionsFromBackend(); // Initial load of data from *our* backend
  isLoading.value = false;

  // Start polling
  if (POLLING_INTERVAL_MS > 0) {
    console.warn(`External API polling active every ${POLLING_INTERVAL_MS / 1000}s. THIS IS AGGRESSIVE.`);
    pollingIntervalId = window.setInterval(pollExternalAPIAndStore, POLLING_INTERVAL_MS);
    // Optional: Run once immediately without waiting for the first interval
    // pollExternalAPIAndStore();
  }
});

onUnmounted(() => {
  if (pollingIntervalId !== undefined) {
    clearInterval(pollingIntervalId);
    console.log('External API polling stopped.');
  }
});

const currentCardPage = computed({});
const totalCardPages = computed(() => backendPaginationData.value.last_page);
const paginatedCards = computed(() => filteredDetections.value);
const getPageNumbers = computed(() => {});
const placeholderImage = 'https://placehold.co/600x400/4f6642/FFFFFF/png?text=No+Image';
</script>

<template>
  <Head title="Detections" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="container mx-auto py-6 px-4">
       <!-- Polling Warning Banner -->
      <!-- <div v-if="POLLING_INTERVAL_MS > 0 && POLLING_INTERVAL_MS <= 5000" 
           class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
        <p>
          <Icon name="AlertTriangle" class="inline h-5 w-5 mr-2" />
          <strong class="font-semibold">Aggressive Polling Active:</strong> External API is being checked every {{ POLLING_INTERVAL_MS / 1000 }} second(s). This is for demonstration and may cause issues with external API rate limits or performance. Reduce counts in `pollExternalAPIAndStore` or increase `POLLING_INTERVAL_MS` for stable use.
        </p>
      </div> -->

      <div class="flex flex-col gap-6">
        <div v-if="isLoading" class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        
        <div v-else>
          <!-- Tabs and content remain largely the same, just ensure they use the `detections.value` -->
          <!-- ... existing template for Tabs, Cards, Table ... -->
           <Tabs default-value="Cards">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <TabsList>
                <TabsTrigger value="Cards"> <Icon name="Grid2x2" /> </TabsTrigger>
                <TabsTrigger value="Table"> <Icon name="TableProperties" /> </TabsTrigger>
              </TabsList>
              <Input v-model="searchQuery" placeholder="Search current page..." class="w-full sm:w-64" />
            </div>
            
            <TabsContent value="Cards">
              <div v-if="paginatedCards.length === 0" class="flex justify-center items-center h-64">
                <p class="text-muted-foreground">
                    {{ backendPaginationData.total === 0 ? 'No detections in the system.' : 'No detections found matching your criteria on this page.'}}
                </p>
              </div>
              <div v-else>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <template v-for="animal in paginatedCards" :key="animal.id">
                     <Card v-if="animal.frame_base64 && animal.reg_base64" class="h-full flex flex-col border-green-500 border-2">
                        <CardHeader class="pb-2">
                          <CardTitle class="text-center text-base sm:text-lg text-green-700 flex items-center justify-center gap-2">
                            <Icon name="CheckCircle2" class="h-6 w-6" /> Potential Match!
                          </CardTitle>
                        </CardHeader>
                        <CardContent class="flex-grow flex flex-col gap-2">
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
                            <!-- <p v-if="animal.external_data_timestamp !== 'N/A'"><strong>Last Seen:</strong> {{ animal.external_data_timestamp }}</p> -->
                          </div>
                        </CardContent>
                      </Card>
                      <CardAnimal
                        v-else
                        :title="animal.pet_type ? animal.pet_type.toUpperCase() : 'UNKNOWN TYPE'"
                        :imagelink="animal.frame_base64 || animal.reg_base64 || placeholderImage"
                        :description="`Breed: ${animal.breed || 'N/A'}${animal.pet_name ? ', Name: ' + animal.pet_name : ''}`"
                        :isStray="animal.is_registered === false && !animal.contact_number && !animal.pet_name"
                        :hasOwnerMatch="!!animal.contact_number"
                        :hasLeash="animal.has_leash"
                        :leashColor="animal.leash_color"
                        :time="animal.timestamp"  class="h-auto min-h-[280px] 2xl:min-h-[320px]"
                      />
                  </template>
                </div>
                 <div class="flex justify-center mt-6" v-if="totalCardPages > 1">
                  <Pagination>
                    <PaginationContent class="flex gap-1 sm:gap-2">
                      <PaginationPrevious @click="currentCardPage = Math.max(1, currentCardPage - 1)" :disabled="currentCardPage === 1" />
                      <template v-for="(page, index) in getPageNumbers" :key="page === 'string' ? `${page}-${index}` : page">
                        <PaginationItem v-if="typeof page === 'number'">
                          <Button class="h-9 w-9 sm:h-10 sm:w-10 text-xs sm:text-sm" :variant="page === currentCardPage ? 'default' : 'outline'" @click="currentCardPage = page">
                            {{ page }}
                          </Button>
                        </PaginationItem>
                        <PaginationEllipsis v-else class="hidden sm:flex" />
                      </template>
                      <PaginationNext @click="currentCardPage = Math.min(totalCardPages, currentCardPage + 1)" :disabled="currentCardPage === totalCardPages" />
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
                            {{ cell.getValue() }}
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
  </AppLayout>
</template>