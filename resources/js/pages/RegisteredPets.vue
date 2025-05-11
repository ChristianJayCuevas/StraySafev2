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

const isLoading = ref(true);
const pets = ref<Pet[]>([]);
const searchQuery = ref('');
const statusFilter = ref('all');

// Pagination for cards
const cardsPerPage = 8;
const currentCardPage = ref(1);

// Filter pets based on search and status
const filteredPets = computed(() => {
  let filtered = pets.value;
  
  // Apply status filter
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(pet => pet.status === statusFilter.value);
  }
  
  // Apply search filter
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(pet =>
      pet.name.toLowerCase().includes(query) ||
      pet.breed.toLowerCase().includes(query) ||
      pet.type.toLowerCase().includes(query) ||
      pet.owner.toLowerCase().includes(query)
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
    return filteredPets.value;
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

const dummyData: Pet[] = [
  {
    id: 1,
    name: 'Max',
    breed: 'Golden Retriever',
    type: 'Dog',
    age: 3,
    owner: 'John Davis',
    registered_date: '2023-09-15',
    status: 'active',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=Golden+Retriever',
  },
  {
    id: 2,
    name: 'Luna',
    breed: 'Siamese',
    type: 'Cat',
    age: 2,
    owner: 'Emma Wilson',
    registered_date: '2024-01-22',
    status: 'active',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=Siamese+Cat',
  },
  {
    id: 3,
    name: 'Rocky',
    breed: 'German Shepherd',
    type: 'Dog',
    age: 5,
    owner: 'Michael Brown',
    registered_date: '2022-07-10',
    status: 'active',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=German+Shepherd',
  },
  {
    id: 4,
    name: 'Oliver',
    breed: 'Maine Coon',
    type: 'Cat',
    age: 4,
    owner: 'Sophia Martinez',
    registered_date: '2023-03-18',
    status: 'inactive',
    vaccine_status: false,
    image: 'https://placehold.co/300x300?text=Maine+Coon',
  },
  {
    id: 5,
    name: 'Bella',
    breed: 'Labrador',
    type: 'Dog',
    age: 2,
    owner: 'William Johnson',
    registered_date: '2024-02-05',
    status: 'active',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=Labrador',
  },
  {
    id: 6,
    name: 'Chloe',
    breed: 'Ragdoll',
    type: 'Cat',
    age: 1,
    owner: 'Ava Thompson',
    registered_date: '2024-04-30',
    status: 'pending',
    vaccine_status: false,
    image: 'https://placehold.co/300x300?text=Ragdoll+Cat',
  },
  {
    id: 7,
    name: 'Duke',
    breed: 'Husky',
    type: 'Dog',
    age: 4,
    owner: 'James Wilson',
    registered_date: '2022-11-20',
    status: 'active',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=Husky',
  },
  {
    id: 8,
    name: 'Milo',
    breed: 'Bengal',
    type: 'Cat',
    age: 3,
    owner: 'Emily Taylor',
    registered_date: '2023-08-12',
    status: 'active',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=Bengal+Cat',
  },
  {
    id: 9,
    name: 'Charlie',
    breed: 'Beagle',
    type: 'Dog',
    age: 6,
    owner: 'Daniel Jackson',
    registered_date: '2021-05-15',
    status: 'inactive',
    vaccine_status: false,
    image: 'https://placehold.co/300x300?text=Beagle',
  },
  {
    id: 10,
    name: 'Lucy',
    breed: 'Persian',
    type: 'Cat',
    age: 5,
    owner: 'Olivia Davis',
    registered_date: '2022-09-08',
    status: 'pending',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=Persian+Cat',
  },
  {
    id: 11,
    name: 'Cooper',
    breed: 'Bulldog',
    type: 'Dog',
    age: 2,
    owner: 'Matthew Miller',
    registered_date: '2023-12-01',
    status: 'active',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=Bulldog',
  },
  {
    id: 12,
    name: 'Lily',
    breed: 'Scottish Fold',
    type: 'Cat',
    age: 1,
    owner: 'Charlotte Brown',
    registered_date: '2024-03-25',
    status: 'active',
    vaccine_status: true,
    image: 'https://placehold.co/300x300?text=Scottish+Fold',
  },
];

// Setup page size for table
onMounted(() => {
  table.setPageSize(10);
});

const fetchPets = async () => {
  try {
    // Use dummy data directly since the API endpoint is not yet implemented
    pets.value = dummyData;
    
    // The following code would be used when your API endpoint is working
    /*
    const response = await axios.get('/api/pets/registered');
    pets.value = response.data;
    */
  } catch (error) {
    console.error('Failed to fetch registered pets:', error);
    pets.value = dummyData;
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

  pages.push(totalPages);

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

onMounted(fetchPets);
</script>

<template>
  <Head title="Registered Pets" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="container mx-auto py-6 px-4">
      <div class="flex flex-col gap-6">
        <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <!-- <div>
            <h1 class="text-2xl font-bold tracking-tight">Registered Pets</h1>
            <p class="text-muted-foreground">Manage and view all registered pets in the system</p>
          </div> -->
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
                <Icon name="Search" class="mx-auto h-12 w-12 text-muted-foreground" />
                <p class="text-muted-foreground mt-4">No pets found matching your criteria</p>
                <Button variant="outline" @click="searchQuery = ''; statusFilter = 'all'" class="mt-4">
                  Clear Filters
                </Button>
              </div>
            </div>
            
            <div v-else>
              <!-- Pet Cards Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card v-for="pet in paginatedCards" :key="pet.id" class="h-full flex flex-col overflow-hidden hover:shadow-md transition-shadow">
                  <div class="relative">
                    <img :src="pet.image" :alt="pet.name" class="w-full aspect-square object-cover" />
                    <div class="absolute top-2 right-2">
                      <Badge :class="getStatusColor(pet.status)" class="capitalize">
                        {{ pet.status }}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader class="pb-2">
                    <div class="flex justify-between items-start">
                      <CardTitle class="text-xl">{{ pet.name }}</CardTitle>
                      <Badge variant="outline" class="ml-2">
                        {{ pet.type }}
                      </Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">{{ pet.breed }}</p>
                  </CardHeader>
                  
                  <CardContent class="flex-grow py-2">
                    <div class="space-y-2">
                      <div class="flex justify-between text-sm">
                        <span class="text-muted-foreground">Age:</span>
                        <span>{{ pet.age }} years</span>
                      </div>
                      <div class="flex justify-between text-sm">
                        <span class="text-muted-foreground">Vaccinated:</span>
                        <span>{{ pet.vaccine_status ? 'Yes' : 'No' }}</span>
                      </div>
                      <div class="flex justify-between text-sm">
                        <span class="text-muted-foreground">Registered:</span>
                        <span>{{ new Date(pet.registered_date).toLocaleDateString() }}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter class="pt-2 border-t">
                    <div class="flex items-center w-full">
                      <Avatar class="h-8 w-8 mr-2">
                        <AvatarFallback>{{ pet.owner.split(' ').map(n => n[0]).join('') }}</AvatarFallback>
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
                
                <div v-else-if="filteredPets.length === 0" class="flex justify-center items-center h-32">
                  <p class="text-muted-foreground">No pets found matching your criteria</p>
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
                        filteredPets.length) }}
                      of {{ filteredPets.length }} results
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