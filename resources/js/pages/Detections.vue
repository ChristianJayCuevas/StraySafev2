<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import { ref, onMounted, computed } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import CardAnimal from '@/components/CardAnimal.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  getCoreRowModel,
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

interface Detection {
  id: string; 
  breed: string | null;
  contact_number: string | null;
  frame_base64: string | null; // Should be a full Data URI or raw base64
  has_leash: boolean | null;
  is_registered: boolean | null;
  leash_color: string | null;
  pet_name: string | null;
  pet_type: string | null;
  reg_base64: string | null;   // Should be a full Data URI or raw base64
}

const isLoading = ref(true);
const detections = ref<Detection[]>([]);
const searchQuery = ref('');
let globalDetectionIdCounter = 0;
const cardsPerPage = 8;
const currentCardPage = ref(1);

// Helper function to format base64 string into a Data URI
function formatBase64Image(base64String: string | null, imageType: string = 'png'): string | null {
  if (!base64String) {
    return null;
  }
  // Check if it's already a Data URI
  if (base64String.startsWith('data:image')) {
    return base64String;
  }
  // Assume it's a raw base64 string and prepend the Data URI scheme
  // You might need to adjust 'imageType' if your API provides type info or if it's not always PNG
  return `data:image/${imageType};base64,${base64String}`;
}

const filteredDetections = computed(() => {
  // ... (filtering logic remains the same)
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

const totalCardPages = computed(() => Math.ceil(filteredDetections.value.length / cardsPerPage));

const paginatedCards = computed(() => {
  // ... (pagination logic remains the same)
  const startIndex = (currentCardPage.value - 1) * cardsPerPage;
  return filteredDetections.value.slice(startIndex, startIndex + cardsPerPage);
});

const columnHelper = createColumnHelper<Detection>();
const columns = [
  // ... (column definitions remain the same)
  columnHelper.accessor('pet_type', {
    header: 'Pet Type',
    cell: info => info.getValue() || 'N/A',
  }),
  columnHelper.accessor('breed', {
    header: 'Breed',
    cell: info => info.getValue() || 'N/A',
  }),
  columnHelper.accessor('pet_name', {
    header: 'Pet Name',
    cell: info => info.getValue() || 'N/A',
  }),
  columnHelper.accessor('has_leash', {
    header: 'Has Leash?',
    cell: info => {
      const value = info.getValue();
      return value === null ? 'N/A' : (value ? 'Yes' : 'No');
    },
  }),
  columnHelper.accessor('is_registered', {
    header: 'Registered?',
    cell: info => {
      const value = info.getValue();
      return value === null ? 'N/A' : (value ? 'Yes' : 'No');
    },
  }),
  columnHelper.accessor('contact_number', {
    header: 'Contact',
    cell: info => info.getValue() || 'N/A',
  }),
  columnHelper.accessor('leash_color', {
    header: 'Leash Color',
    cell: info => info.getValue() || 'N/A',
  }),
];

const table = useVueTable({
  // ... (table configuration remains the same)
  get data() {
    return filteredDetections.value;
  },
  columns,
  getRowId: row => row.id,
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

async function fetchDetections() {
  isLoading.value = true;
  detections.value = [];
  globalDetectionIdCounter = 0; 

  const API_BASE_URL = 'https://straysafe.me/info'; 
  const requests = [];

  // Prepare requests for dogs
  for (let i = 1; i <= 60; i++) {
    requests.push(
      axios.get(`${API_BASE_URL}?id=${i}&type=dog`)
        .then(response => ({ ...response.data, originalQueryType: 'dog', originalQueryId: i }))
        .catch(error => {
          console.warn(`Failed to fetch dog with id=${i}:`, error.message);
          return null; 
        })
    );
  }

  // Prepare requests for cats
  for (let i = 1; i <= 20; i++) {
    requests.push(
      axios.get(`${API_BASE_URL}?id=${i}&type=cat`)
        .then(response => ({ ...response.data, originalQueryType: 'cat', originalQueryId: i }))
        .catch(error => {
          console.warn(`Failed to fetch cat with id=${i}:`, error.message);
          return null; 
        })
    );
  }

  try {
    const responses = await Promise.all(requests);
    const fetchedDetections: Detection[] = [];
    responses.forEach(animalData => {
      if (animalData) { 
        // Ensure 'pet_type' from API response is used, or fallback to query type
        const apiPetType = animalData.pet_type || animalData.originalQueryType;

        fetchedDetections.push({
          id: `client-${globalDetectionIdCounter++}`, 
          breed: animalData.breed || null,
          contact_number: animalData.contact_number === 'none' ? null : (animalData.contact_number || null),
          // Use the helper function to ensure correct Data URI format
          frame_base64: formatBase64Image(animalData.frame_base64, apiPetType === 'dog' ? 'jpeg' : 'png'), // Example: dog as jpeg, cat as png
          has_leash: typeof animalData.has_leash === 'boolean' ? animalData.has_leash : null,
          is_registered: typeof animalData.is_registered === 'boolean' ? animalData.is_registered : null,
          leash_color: animalData.leash_color === 'none' ? null : (animalData.leash_color || null),
          pet_name: animalData.pet_name === 'none' ? null : (animalData.pet_name || null),
          pet_type: apiPetType, 
          // Use the helper function for reg_base64 as well
          reg_base64: formatBase64Image(animalData.reg_base64, apiPetType === 'dog' ? 'jpeg' : 'png'), // Example
        });
      }
    });
    detections.value = fetchedDetections;

  } catch (error) {
    console.error('Error processing batched detections:', error);
    detections.value = [];
  } finally {
    isLoading.value = false;
  }
}

onMounted(() => {
  // ... (onMounted logic remains the same)
  table.setPageSize(10);
  fetchDetections();
});

const getPageNumbers = computed(() => {
  // ... (getPageNumbers logic remains the same)
  const totalPages = totalCardPages.value;
  const currentPage = currentCardPage.value;
  const maxVisiblePages = 5;

  if (totalPages <= maxVisiblePages) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  let pages: (number | string)[] = [];
  pages.push(1);
  
  let coreRangeStart, coreRangeEnd;
  const corePagesLength = maxVisiblePages - 2; 

  if (currentPage <= Math.ceil(corePagesLength / 2) +1 ) { 
      coreRangeStart = 2;
      coreRangeEnd = Math.min(totalPages - 1, corePagesLength);
  } else if (currentPage >= totalPages - Math.floor(corePagesLength / 2) -1) { 
      coreRangeStart = Math.max(2, totalPages - corePagesLength + 1);
      coreRangeEnd = totalPages - 1;
  } else { 
      coreRangeStart = currentPage - Math.floor((corePagesLength - 2) / 2); 
      coreRangeEnd = currentPage + Math.ceil((corePagesLength - 2) / 2);
  }
  
  if (coreRangeStart > 2) {
    pages.push('ellipsis-start');
  }

  for (let i = coreRangeStart; i <= coreRangeEnd; i++) {
    if (i > 1 && i < totalPages) pages.push(i);
  }

  if (coreRangeEnd < totalPages - 1) {
    pages.push('ellipsis-end');
  }

  if (totalPages > 1) pages.push(totalPages);
  
  pages = pages.filter((page, index, self) => 
    typeof page === 'string' || self.indexOf(page) === index
  );
  
  if (pages.length > 1 && pages[0] === 1 && pages[1] === 1) pages.splice(1,1);
  if (pages.length > 1 && pages[pages.length-1] === totalPages && pages[pages.length-2] === totalPages) pages.splice(pages.length-1,1);

  return pages;
});

const placeholderImage = 'https://placehold.co/600x400/4f6642/FFFFFF/png?text=No+Image';

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
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <TabsList>
                <TabsTrigger value="Cards">
                  <Icon name="Grid2x2" />
                </TabsTrigger>
                <TabsTrigger value="Table">
                  <Icon name="TableProperties" />
                </TabsTrigger>
              </TabsList>
              <Input v-model="searchQuery" placeholder="Search by type, breed, name..." class="w-full sm:w-64" />
            </div>
            
            <TabsContent value="Cards">
              <div v-if="filteredDetections.length === 0" class="flex justify-center items-center h-64">
                <p class="text-muted-foreground">No detections found</p>
              </div>
              <div v-else>
                <!-- Card Grid -->
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <template v-for="animal in paginatedCards" :key="animal.id">
                    <!-- Conditional Matched Card -->
                    <Card v-if="animal.frame_base64 && animal.reg_base64" class="h-full flex flex-col border-green-500 border-2">
                      <CardHeader class="pb-2">
                        <CardTitle class="text-center text-base sm:text-lg text-green-700 flex items-center justify-center gap-2">
                          <Icon name="CheckCircle2" class="h-6 w-6" />
                          Potential Match!
                        </CardTitle>
                      </CardHeader>
                      <CardContent class="flex-grow flex flex-col gap-2 pt-2"> {/* Reduced gap for tighter layout if needed */}
                        <div class="text-center"> {/* Removed mb-2 to make badge part of the flow */}
                          <Badge :variant="animal.has_leash === true ? 'default' : 'destructive'">
                            {{ animal.has_leash === true ? 'Collar/Leashed' : 'No Collar/Leash' }}
                          </Badge>
                        </div>
                        <p class="text-xs sm:text-sm text-center text-muted-foreground"> {/* Removed mb-1 */}
                          Detected {{ animal.pet_type || 'pet' }} appears to match registered {{ animal.pet_type || 'pet' }}.
                        </p>
                        <div class="grid grid-cols-2 gap-2 items-start my-1"> {/* Added my-1 for slight spacing */}
                          <div>
                            <p class="text-xs font-semibold text-center mb-1">Detected:</p>
                            <img :src="formatBase64Image(animal.frame_base64, animal.pet_type === 'dog' ? 'jpeg' : 'png') || placeholderImage" alt="Detected Pet" class="w-full h-auto aspect-square rounded object-contain border p-0.5" />
                          </div>
                          <div>
                            <p class="text-xs font-semibold text-center mb-1">Registered:</p>
                            <img :src="formatBase64Image(animal.reg_base64, animal.pet_type === 'dog' ? 'jpeg' : 'png') || placeholderImage" alt="Registered Pet" class="w-full h-auto aspect-square rounded object-contain border p-0.5" />
                          </div>
                        </div>
                        <div class="mt-auto pt-2 text-xs border-t">
                          <p v-if="animal.pet_name"><strong>Name:</strong> {{ animal.pet_name }}</p>
                          <p><strong>Type:</strong> {{ animal.pet_type || 'N/A' }}</p>
                          <p><strong>Breed:</strong> {{ animal.breed || 'N/A' }}</p>
                          <p v-if="animal.has_leash === true"><strong>Leash Color:</strong> {{ animal.leash_color || 'Unknown' }}</p>
                          <p><strong>Registered:</strong> {{ animal.is_registered ? 'Yes' : 'No' }}</p>
                          <p v-if="animal.contact_number"><strong>Contact:</strong> {{ animal.contact_number }}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <!-- Standard CardAnimal for non-matched or partially-detailed items -->
                    <CardAnimal
                      v-else
                      :title="animal.pet_type ? animal.pet_type.toUpperCase() : 'UNKNOWN TYPE'"
                      :imagelink="formatBase64Image(animal.frame_base64, animal.pet_type === 'dog' ? 'jpeg' : 'png') || formatBase64Image(animal.reg_base64, animal.pet_type === 'dog' ? 'jpeg' : 'png') || placeholderImage"
                      :description="`${animal.pet_name ? 'Name: '+animal.pet_name+', ' : ''}Breed: ${animal.breed || 'N/A'}`"
                      :isStray="animal.is_registered === false && !animal.contact_number && !animal.pet_name" 
                      :hasOwnerMatch="!!animal.contact_number"
                      class="h-full"
                    >
                      <template #footer>
                        <div class="flex flex-col gap-1 p-2 text-xs">
                          <div class="text-center mb-1"> {/* Leash badge is here in the footer */}
                             <Badge :variant="animal.has_leash === true ? 'default' : 'destructive'">
                              {{ animal.has_leash === true ? 'Collar/Leashed' : 'No Collar/Leash' }}
                            </Badge>
                          </div>
                          <div class="flex justify-between">
                            <span>Type:</span>
                            <span class="truncate">{{ animal.pet_type || 'N/A' }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span>Breed:</span>
                            <span class="truncate">{{ animal.breed || 'N/A' }}</span>
                          </div>
                          <div v-if="animal.has_leash === true" class="flex justify-between">
                            <span>Leash Color:</span>
                            <span class="truncate">{{ animal.leash_color || 'Unknown' }}</span>
                          </div>
                          <div class="flex justify-between">
                            <span>Registered:</span>
                            <span>{{ animal.is_registered === null ? 'N/A' : (animal.is_registered ? 'Yes' : 'No') }}</span>
                          </div>
                          <div v-if="animal.reg_base64 && animal.is_registered && animal.frame_base64" class="mt-1">
                            <p class="font-medium text-center">Registration Proof:</p>
                            <img :src="formatBase64Image(animal.reg_base64, animal.pet_type === 'dog' ? 'jpeg' : 'png') || placeholderImage" alt="Registration Proof" class="max-w-full h-20 mx-auto rounded mt-1 object-contain border" />
                          </div>
                           <div v-if="animal.contact_number" class="flex justify-between mt-1 border-t pt-1">
                            <span class="font-semibold">Contact:</span>
                            <span>{{ animal.contact_number }}</span>
                          </div>
                        </div>
                      </template>
                    </CardAnimal>
                  </template>
                </div>

                <!-- Pagination and other content remains the same -->
                <div class="flex justify-center mt-6">
                  <Pagination v-if="filteredDetections.length > cardsPerPage">
                    <PaginationContent class="flex gap-2">
                      <PaginationPrevious 
                        @click="currentCardPage = Math.max(1, currentCardPage - 1)"
                        :disabled="currentCardPage === 1"
                      />
                      <template v-for="(page, index) in getPageNumbers" :key="page === 'string' ? `${page}-${index}` : page">
                        <PaginationItem v-if="typeof page === 'number'">
                          <Button 
                            class="h-10 w-10" 
                            :variant="page === currentCardPage ? 'default' : 'outline'"
                            @click="currentCardPage = page"
                          >
                            {{ page }}
                          </Button>
                        </PaginationItem>
                        <PaginationEllipsis v-else />
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
                            <div 
                              class="flex items-center justify-center space-x-1"
                              :class="{'cursor-pointer': header.column.getCanSort()}"
                              @click="header.column.getCanSort() && header.column.toggleSorting()"
                            >
                              <span>{{ header.column.columnDef.header }}</span>
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
                      <TableCaption>
                        Showing {{ table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 }}
                        to {{ Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                          filteredDetections.length) }}
                        of {{ filteredDetections.length }} results
                      </TableCaption>
                    </Table>

                    <div class="flex items-center justify-between space-x-2 py-4">
                       <span class="text-sm text-muted-foreground">
                        Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }}
                      </span>
                      <div class="flex space-x-2">
                        <Button @click="table.previousPage()" :disabled="!table.getCanPreviousPage()" variant="outline"
                          size="sm">
                          <Icon name="ChevronLeft" class="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <Button @click="table.nextPage()" :disabled="!table.getCanNextPage()" variant="outline" size="sm">
                          Next
                          <Icon name="ChevronRight" class="h-4 w-4 ml-1" />
                        </Button>
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