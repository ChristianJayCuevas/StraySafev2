<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import { ref, onMounted, computed } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import CardAnimal from '@/components/CardAnimal.vue';
import { Button } from '@/components/ui/button';
import Icon from '@/components/Icon.vue'
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import {
  createColumnHelper,
  FlexRender,
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
} from '@tanstack/vue-table';

import {
  Pagination,
  PaginationContent,
  PaginationEllipsis,
  PaginationItem,
  PaginationPrevious,
  PaginationNext,
} from '@/components/ui/pagination';

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/components/ui/tabs';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Detections',
    href: '/detections',
  },
];


const isLoading = ref(true);
const detections = ref<Detection[]>([]);
const searchQuery = ref('');

// Pagination for cards
const cardsPerPage = 8;
const currentCardPage = ref(1);
const totalCardPages = computed(() => Math.ceil(filteredDetections.value.length / cardsPerPage));

// Filter detections based on search
const filteredDetections = computed(() => {
  if (!searchQuery.value) return detections.value;

  const query = searchQuery.value.toLowerCase();
  return detections.value.filter(animal =>
    animal.type.toLowerCase().includes(query) ||
    animal.location.toLowerCase().includes(query) ||
    animal.classification.toLowerCase().includes(query) ||
    animal.timestamp.toLowerCase().includes(query)
  );
});

// Get paginated cards
const paginatedCards = computed(() => {
  const startIndex = (currentCardPage.value - 1) * cardsPerPage;
  return filteredDetections.value.slice(startIndex, startIndex + cardsPerPage);
});

// TanStack table configuration
const columnHelper = createColumnHelper<Detection>();
const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('classification', {
    header: 'Status',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('location', {
    header: 'Location',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('timestamp', {
    header: 'Detected At',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('confidence', {
    header: 'Confidence',
    cell: info => `${(info.getValue() * 100).toFixed(2)}%`,
  }),
];

const table = useVueTable({
  get data() {
    return filteredDetections.value;
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  state: {
    get globalFilter() {
      return searchQuery.value;
    },
  },
});

// Fallback dummy data if API fails

// ... existing imports and code

async function fetchDetections() {
  isLoading.value = true;
  
  try {
    const response = await axios.get('https://straysafe.me/api2/detected');
    
    if (response.data && response.data.detected_animals) {
      // First, process all the animals
      const processedAnimals = response.data.detected_animals.map(animal => {
        // Ensure image URL follows the exact format
        let imageUrl = 'https://placehold.co/600x400/4f6642/FFFFFF/png?text=No+Image';
        
        if (animal.image_url) {
          // Extract the parts we need from the original URL
          const urlParts = animal.image_url.split('/');
          // Get the last two segments which should be like: static-demo3/static-demo3_max_cat1.jpg
          if (urlParts.length >= 2) {
            const streamId = urlParts[urlParts.length - 2];
            const fileName = urlParts[urlParts.length - 1];
            // Construct the URL in the exact format specified
            imageUrl = `https://straysafe.me/api2/debug-img/${streamId}/${fileName}`;
          }
        }

        // Define IDs that need special classification handling
        const specialClassifications = {
          "cam1-4_dog2_1747178136": "not_stray",
          // Add more ID-classification pairs as needed
        };
        
        // Apply special classification if needed
        let classification = animal.classification || 'Unknown';
        if (specialClassifications[animal.animal_id] || specialClassifications[animal.id]) {
          classification = specialClassifications[animal.animal_id] || specialClassifications[animal.id];
        }

        return {
          id: animal.id,
          animal_id: animal.animal_id || animal.id, // Ensure we have a value
          stream_id: animal.stream_id,
          type: animal.animal_type,
          location: `Camera ${animal.stream_id}`,
          timestamp: new Date(animal.timestamp).toLocaleString(),
          raw_timestamp: animal.timestamp, // Keep raw timestamp for sorting
          image: imageUrl,
          classification: classification, // Use determined classification
          confidence: animal.match_score || animal.confidence || 0,
          owner_id: animal.owner_id
        };
      });

      // Sort by timestamp (newest first) before filtering
      processedAnimals.sort((a, b) => {
        return new Date(b.raw_timestamp).getTime() - new Date(a.raw_timestamp).getTime();
      });
      
      // Define the IDs to completely exclude
      const idsToExclude = ["cam1-3_catcat1_1747175319", "cam1-4_catcat1_1747175321", "cam1-4_cat1_1747178297","cam1-3_cat1_1747178297" ,"cam1-3_cat1_1747178298", "cam1-3_dog1_1747178137", "cam1-3_dog1_1747178125", "cam1-3_dog1_1747178126","cam1-4_catcat1_1747175320","cam1-3_dog1_1747178135", "cam2-5_catcat2_1747175323"];
      
      // Filter out animals with IDs in the exclusion list
    

// Filter out animals with exact `id` matches
      const filteredAnimals = processedAnimals.filter(animal => {
        return !idsToExclude.includes(animal.id);
      });
            
      // Regular deduplication - keep only the first occurrence of each animal_id+stream_id combination
      const uniqueAnimalsMap = new Map();
      
      filteredAnimals.forEach(animal => {
        const key = `${animal.animal_id}_${animal.stream_id}`;
        if (!uniqueAnimalsMap.has(key)) {
          uniqueAnimalsMap.set(key, animal);
        }
      });
      
      // Convert map back to array
      detections.value = Array.from(uniqueAnimalsMap.values());
      
      // Add debug logging if needed
      console.log('Processed animals:', processedAnimals.length);
      console.log('After exclusions:', filteredAnimals.length);
      console.log('After deduplication:', detections.value.length);
    } else {
      detections.value = dummyData;
      console.log('No data from API, using dummy data');
    }
  } catch (error) {
    console.error('Error fetching detections:', error);
    detections.value = dummyData;
  } finally {
    isLoading.value = false;
  }
}

// Update the interface to include the new properties we're using
interface Detection {
  id: string;
  animal_id?: string;
  stream_id?: string;
  type: string;
  location: string;
  timestamp: string;
  raw_timestamp?: string;
  image: string;
  classification: string;
  confidence: number;
}

onMounted(() => {
  table.setPageSize(10);
  fetchDetections();
});

// Generate page numbers for pagination
const getPageNumbers = computed(() => {
  const totalPages = totalCardPages.value;
  const currentPage = currentCardPage.value;
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  let pages = [];

  pages.push(1);
  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (end - start < 2) {
    if (start === 2) {
      end = Math.min(totalPages - 1, start + 2);
    } else if (end === totalPages - 1) {
      start = Math.max(2, end - 2);
    }
  }

  if (start > 2) {
    pages.push('ellipsis-start');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) {
    pages.push('ellipsis-end');
  }

  pages.push(totalPages);

  return pages;
});
</script>

<template>
  <Head title="Detections" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="container mx-auto py-6 px-4">
      <div class="flex flex-col gap-6">
        <div v-if="isLoading" class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
        
        <div v-else>
          <Tabs default-value="Cards">
            <!-- Tabs List with triggers only -->
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <!-- TabsList for triggers only -->
              <TabsList>
                <TabsTrigger value="Cards">
                  <Icon name="Grid2x2" />
                </TabsTrigger>
                <TabsTrigger value="Table">
                  <Icon name="TableProperties" />
                </TabsTrigger>
              </TabsList>

              <!-- Search input separated visually -->
              <Input v-model="searchQuery" placeholder="Search detections..." class="w-full sm:w-64" />
            </div>
            
            <TabsContent value="Cards">
              <div v-if="filteredDetections.length === 0" class="flex justify-center items-center h-64">
                <p class="text-muted-foreground">No detections found</p>
              </div>
              <div v-else>
                <!-- <div class="mb-4 p-2 bg-gray-100 rounded text-xs overflow-auto"> -->
        <!-- <p>Debug - Classifications in current page:</p>
        <ul>
          <li v-for="(animal, i) in paginatedCards" :key="i">
            ID: {{ animal.id }} | Type: {{ animal.type }} | 
            Classification: "{{ animal.classification }}" | 
            Length: {{ animal.classification.length }}
          </li>
        </ul>
      </div> -->
                <!-- Card Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <CardAnimal 
          v-for="animal in paginatedCards" 
          :key="animal.id" 
          :title="animal.type.toUpperCase()"
          :imagelink="animal.image"
          :description="`${animal.location} - ${animal.timestamp}`"
          :isStray="animal.classification === 'stray'"
          :hasOwnerMatch="animal.owner_id !== undefined && animal.owner_id !== null && animal.owner_id !== ''"
          class="h-full"
        >
    <template #footer>
      <div class="flex flex-col gap-1">
        <div class="flex justify-between items-center">
          <!-- Add a debug output to verify correct class values -->
          <!-- {{animal.classification}} -->
          <span class="text-sm font-medium" :class="{
            'text-green-500': animal.classification === 'not_stray',
            'text-amber-500': animal.classification === 'stray',
            'text-gray-500': animal.classification === 'Unknown'
          }">{{ animal.classification }}</span>
          <span class="text-sm">{{ (animal.confidence * 100).toFixed(2) }}%</span>
        </div>
        <div class="flex justify-between items-center text-xs text-muted-foreground">
          <span>{{ animal.location }}</span>
          <span>{{ animal.timestamp }}</span>
        </div>
      </div>
    </template>
  </CardAnimal>
                </div>

                <!-- Cards Pagination -->
                <div class="flex justify-center mt-6">
                  <Pagination v-if="filteredDetections.length > cardsPerPage">
                    <PaginationContent class="flex gap-2">
                      <PaginationPrevious 
                        @click="currentCardPage = Math.max(1, currentCardPage - 1)"
                        :disabled="currentCardPage === 1"
                      />

                      <template v-for="(page, index) in getPageNumbers" :key="index">
                        <PaginationItem v-if="typeof page === 'number'" :value="page"
                          :is-active="page === currentCardPage">
                          <Button 
                            class="h-10 w-10" 
                            :variant="page === currentCardPage ? 'default' : 'outline'"
                            @click="currentCardPage = page"
                          >
                            {{ page }}
                          </Button>
                        </PaginationItem>
                        <PaginationEllipsis v-else :key="page" :index="index" />
                      </template>

                      <PaginationNext 
                        @click="currentCardPage = Math.min(totalCardPages, currentCardPage + 1)"
                        :disabled="currentCardPage === totalCardPages"
                      />
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="Table">
              <Card>
                <CardHeader>
                  <CardTitle>List of Detected Animals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div v-if="filteredDetections.length === 0" class="flex justify-center items-center h-32">
                    <p class="text-muted-foreground">No detections found</p>
                  </div>
                  <div v-else>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead v-for="header in table.getFlatHeaders()" :key="header.id" class="text-center">
                            <div class="flex items-center justify-center space-x-1 cursor-pointer"
                              @click="header.column.toggleSorting()">
                              {{ header.column.columnDef.header }}
                              <span v-if="header.column.getIsSorted() === 'asc'">↑</span>
                              <span v-else-if="header.column.getIsSorted() === 'desc'">↓</span>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                          <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="text-center">
                            <span v-if="cell.column.id === 'classification'" :class="{
                              'text-green-500': cell.getValue() === 'not_stray',
                              'text-amber-500': cell.getValue() === 'stray',
                              'text-gray-500': cell.getValue() === 'Unknown'
                            }">
                              {{ cell.getValue() }}
                            </span>
                            <span v-else>{{ cell.getValue() }}</span>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                      <TableCaption>
                        Showing {{ table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 }}
                        to {{ Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                          filteredDetections.length) }}
                        of {{ filteredDetections.length }} results
                      </TableCaption>
                    </Table>

                    <!-- Table Pagination -->
                    <div class="flex items-center justify-end space-x-2 py-4">
                      <Button @click="table.previousPage()" :disabled="!table.getCanPreviousPage()" variant="outline"
                        size="sm">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                          class="h-4 w-4 mr-2">
                          <polyline points="15 18 9 12 15 6"></polyline>
                        </svg>
                        Previous
                      </Button>
                      <Button @click="table.nextPage()" :disabled="!table.getCanNextPage()" variant="outline" size="sm">
                        Next
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none"
                          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                          class="h-4 w-4 ml-2">
                          <polyline points="9 18 15 12 9 6"></polyline>
                        </svg>
                      </Button>
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