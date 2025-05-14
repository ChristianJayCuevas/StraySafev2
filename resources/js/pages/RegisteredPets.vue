<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import { ref, onMounted, computed } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/Icon.vue';
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
    title: 'Registered Pets',
    href: '/pets/registered',
  },
];

interface Pet {
  id: number;
  name: string;
  breed: string;
  type: string;
  age: number;
  owner: string;
  registered_date: string;
  status: 'active' | 'pending' | 'inactive';
  vaccine_status: boolean;
  image: string;
}

// Update the interface to match the API response structure
interface ApiPet {
  id: number;
  pet_name: string;
  animal_type: string;
  picture: string;
  status: string;
  owner: string;
  breed: string;
  contact: string;
  created_at: string;
}

// Add interface for API response structure
interface ApiResponse {
  status: string;
  data: ApiPet[];
}

const isLoading = ref(true);
const pets = ref<Pet[]>([]);
// Changed from an array to store the formatted API data
const newpets = ref<ApiPet[]>([]);
const searchQuery = ref('');
const statusFilter = ref('all');

// Pagination for cards
const cardsPerPage = 8;
const currentCardPage = ref(1);

// Filter pets based on search and status
const filteredPets = computed(() => {
  let filtered = newpets.value;
  
  // Apply status filter
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(pet => pet.status === statusFilter.value);
  }
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(pet =>
      pet.pet_name.toLowerCase().includes(query) ||
      pet.breed.toLowerCase().includes(query) ||
      pet.animal_type.toLowerCase().includes(query) ||
      (pet.contact && pet.contact.toLowerCase().includes(query))
    );
  }
  
  return filtered;
});
// Calculate total pages
const totalCardPages = computed(() => Math.ceil(filteredPets.value.length / cardsPerPage));

// Get paginated cards
const paginatedCards = computed(() => {
  const startIndex = (currentCardPage.value - 1) * cardsPerPage;
  return filteredPets.value.slice(startIndex, startIndex + cardsPerPage);
});

// TanStack table configuration
const columnHelper = createColumnHelper<Pet>();
const columns = [
  columnHelper.accessor('id', {
    header: 'ID',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('breed', {
    header: 'Breed',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('age', {
    header: 'Age',
    cell: info => `${info.getValue()} years`,
  }),
  columnHelper.accessor('owner', {
    header: 'Owner',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('registered_date', {
    header: 'Registered',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => {
      const status = info.getValue();
      let color = 'bg-gray-400';
      if (status === 'active') color = 'bg-green-500';
      if (status === 'pending') color = 'bg-amber-500';
      if (status === 'inactive') color = 'bg-red-500';
      
      return h('div', { class: 'flex justify-center' }, [
        h('span', { class: `w-3 h-3 rounded-full ${color}` })
      ]);
    },
  }),
  columnHelper.accessor('vaccine_status', {
    header: 'Vaccinated',
    cell: info => info.getValue() ? 'Yes' : 'No',
  }),
];

const table = useVueTable({
  get data() {
    return pets.value;
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

// Setup page size for table
onMounted(() => {
  table.setPageSize(10);
});

const fetchPets = async () => {
  try {
    const response = await axios.get('/registered-animals');
    // Check if response has data property and it's an array
    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      newpets.value = response.data.data;
    } else if (response.data && response.data.status === 'success' && response.data.data) {
      // If API returns only one item in data property
      newpets.value = [response.data.data];
    } else if (response.data && response.data.data) {
      // Directly access data property if that's where the array is
      newpets.value = Array.isArray(response.data.data) ? response.data.data : [response.data.data];
    } else {
      // Empty array if no data
      newpets.value = [];
    }
    
    // Convert API data format to Pet format for the table (only if there's data)
    if (newpets.value.length > 0) {
      pets.value = newpets.value.map(pet => ({
        id: pet.id,
        name: pet.pet_name,
        breed: pet.breed,
        type: pet.animal_type,
        age: 0, // Not available in API
        owner: pet.owner,
        registered_date: new Date(pet.created_at).toLocaleDateString(),
        status: pet.status as 'active' | 'pending' | 'inactive',
        vaccine_status: false, // Not available in API
        image: pet.picture || 'https://placehold.co/300x300?text=No+Image'
      }));
    } else {
      pets.value = [];
    }
  } catch (error) {
    console.error('Failed to fetch registered pets:', error);
    // Don't use dummy data, just set empty arrays
    newpets.value = [];
    pets.value = [];
  } finally {
    isLoading.value = false;
  }
};

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

  if (totalPages > 1) {
    pages.push(totalPages);
  }

  return pages;
});

// Get status badge color
const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800 border-green-300';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'inactive': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

onMounted(() => {
  fetchPets();
});
</script>

<template>
  <Head title="Registered Pets" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="container mx-auto py-6 px-4">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 class="text-2xl font-bold tracking-tight">Registered Pets</h1>
            <p class="text-muted-foreground">Manage and view all registered pets in the system</p>
          </div>
          <Button class="gap-2">
            <Icon name="Plus" class="h-4 w-4" />
            Register New Pet
          </Button>
        </div>
        
        <Tabs default-value="Cards">
          <!-- Tabs with filters -->
          <div class="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-4 mb-4">
            <div class="flex gap-4 items-center w-full sm:w-auto">
              <TabsList>
                <TabsTrigger value="Cards">
                  <Icon name="Grid2x2" class="mr-2 h-4 w-4" />
                  Cards
                </TabsTrigger>
                <TabsTrigger value="Table">
                  <Icon name="TableProperties" class="mr-2 h-4 w-4" />
                  Table
                </TabsTrigger>
              </TabsList>
              
              <div class="flex gap-2">
                <Button @click="statusFilter = 'all'" 
                        :variant="statusFilter === 'all' ? 'default' : 'outline'" 
                        size="sm" 
                        class="text-xs">
                  All
                </Button>
                <Button @click="statusFilter = 'active'" 
                        :variant="statusFilter === 'active' ? 'default' : 'outline'" 
                        size="sm" 
                        class="text-xs">
                  Active
                </Button>
                <Button @click="statusFilter = 'pending'" 
                        :variant="statusFilter === 'pending' ? 'default' : 'outline'" 
                        size="sm" 
                        class="text-xs">
                  Pending
                </Button>
                <Button @click="statusFilter = 'inactive'" 
                        :variant="statusFilter === 'inactive' ? 'default' : 'outline'" 
                        size="sm" 
                        class="text-xs">
                  Inactive
                </Button>
              </div>
            </div>

            <div class="w-full sm:w-64">
              <Input v-model="searchQuery" placeholder="Search pets..." class="w-full" />
            </div>
          </div>
          
          <!-- Cards View -->
          <TabsContent value="Cards">
            <div v-if="isLoading" class="flex justify-center items-center h-64">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            
            <div v-else-if="filteredPets.length === 0" class="flex justify-center items-center h-64">
              <div class="text-center">
                <Icon name="PawPrint" class="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 class="text-lg font-medium mt-4">No Animals Registered Yet</h3>
                <p class="text-muted-foreground mt-2">Click the "Register New Pet" button to add your first pet</p>
                <Button class="mt-4 gap-2" @click="searchQuery = ''; statusFilter = 'all'">
                  <Icon name="Plus" class="h-4 w-4" />
                  Register New Pet
                </Button>
              </div>
            </div>
            
            <div v-else>
              <!-- Pet Cards Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card 
                  v-for="pet in paginatedCards" 
                  :key="pet.id" 
                  class="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow"
                >
                  <div class="relative">
                    <img 
                      :src="pet.picture || 'https://placehold.co/300x300?text=No+Image'" 
                      :alt="pet.pet_name" 
                      class="w-full aspect-square object-cover" 
                      @error="(e) => e.target.src = 'https://placehold.co/300x300?text=No+Image'"
                    />
                    <div class="absolute top-2 right-2">
                      <Badge :class="getStatusColor(pet.status)" class="capitalize">
                        {{ pet.status }}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader class="pb-2">
                    <div class="flex justify-between items-start">
                      <CardTitle class="text-xl">{{ pet.pet_name }}</CardTitle>
                      <Badge variant="outline" class="ml-2">
                        {{ pet.animal_type }}
                      </Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">{{ pet.breed }}</p>
                  </CardHeader>
                  
                  <CardContent class="flex-grow py-2">
                    <div class="space-y-2">
                      <div class="flex justify-between text-sm">
                        <span class="text-muted-foreground">Registered:</span>
                        <span>{{ new Date(pet.created_at).toLocaleDateString() }}</span>
                      </div>
                      <div class="flex justify-between text-sm">
                        <span class="text-muted-foreground">Contact:</span>
                        <span>{{ pet.contact || 'N/A' }}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter class="pt-2 border-t">
                    <div class="flex items-center w-full">
                      <Avatar class="h-8 w-8 mr-2">
                        <AvatarFallback>
                          {{ pet.owner?.split(' ').map(n => n[0]).join('') }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex-grow overflow-hidden">
                        <p class="text-sm font-medium truncate">{{ pet.owner }}</p>
                        <p class="text-xs text-muted-foreground">Owner</p>
                      </div>
                      <Button variant="ghost" size="icon">
                        <Icon name="MoreVertical" class="h-4 w-4" />
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>

              <!-- Cards Pagination -->
              <div class="flex justify-center mt-6">
                <Pagination v-if="filteredPets.length > cardsPerPage">
                  <PaginationContent class="flex gap-2">
                    <PaginationPrevious 
                      @click="currentCardPage > 1 && (currentCardPage--)" 
                      :class="{ 'opacity-50 cursor-not-allowed': currentCardPage === 1 }" 
                    />

                    <template v-for="(page, index) in getPageNumbers" :key="index">
                      <PaginationItem v-if="typeof page === 'number'" :value="page" :is-active="page === currentCardPage">
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
                      @click="currentCardPage < totalCardPages && (currentCardPage++)" 
                      :class="{ 'opacity-50 cursor-not-allowed': currentCardPage === totalCardPages }" 
                    />
                  </PaginationContent>
                </Pagination>
              </div>
            </div>
          </TabsContent>
          
          <!-- Table View -->
          <TabsContent value="Table">
            <Card>
              <CardHeader>
                <CardTitle>List of Registered Pets</CardTitle>
              </CardHeader>
              <CardContent>
                <div v-if="isLoading" class="flex justify-center items-center h-32">
                  <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
                
                <div v-else-if="pets.length === 0" class="flex justify-center items-center h-32">
                  <div class="text-center">
                    <Icon name="PawPrint" class="mx-auto h-8 w-8 text-muted-foreground" />
                    <h3 class="text-base font-medium mt-2">No Animals Registered Yet</h3>
                    <p class="text-sm text-muted-foreground mt-1">Register your first pet to see it here</p>
                  </div>
                </div>
                
                <div v-else>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead v-for="header in table.getFlatHeaders()" :key="header.id">
                          <div class="flex items-center justify-center space-x-1 cursor-pointer"
                            @click="header.column.toggleSorting()">
                            {{ header.column.columnDef.header }}
                            <span v-if="header.column.getIsSorted() === 'asc'">↑</span>
                            <span v-else-if="header.column.getIsSorted() === 'desc'">↓</span>
                          </div>
                        </TableHead>
                        <TableHead class="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow v-for="row in table.getRowModel().rows" :key="row.id" class="hover:bg-muted/50">
                        <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="text-center">
                          <component :is="cell.column.columnDef.cell" :row="row" :getValue="() => cell.getValue()" />
                        </TableCell>
                        <TableCell class="text-center">
                          <div class="flex items-center justify-center space-x-2">
                            <Button variant="ghost" size="icon" class="h-8 w-8">
                              <Icon name="Edit" class="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" class="h-8 w-8">
                              <Icon name="Eye" class="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                    <TableCaption>
                      Showing {{ table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 }}
                      to {{ Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        pets.length) }}
                      of {{ pets.length }} results
                    </TableCaption>
                  </Table>

                  <!-- Table Pagination -->
                  <div class="flex items-center justify-end space-x-2 py-4">
                    <Button 
                      @click="table.previousPage()" 
                      :disabled="!table.getCanPreviousPage()" 
                      variant="outline"
                      size="sm"
                    >
                      <Icon name="ChevronLeft" class="h-4 w-4 mr-2" />
                      Previous
                    </Button>
                    <Button 
                      @click="table.nextPage()" 
                      :disabled="!table.getCanNextPage()" 
                      variant="outline" 
                      size="sm"
                    >
                      Next
                      <Icon name="ChevronRight" class="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  </AppLayout>
</template>