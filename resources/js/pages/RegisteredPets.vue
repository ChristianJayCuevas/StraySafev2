<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head, router } from '@inertiajs/vue3'; // Added router for navigation
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
  FlexRender, // Import FlexRender
  getCoreRowModel,
  getExpandedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useVueTable,
  type ColumnDef, // Import ColumnDef for explicit typing
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
    href: '/pets/registered', // Assuming this is the correct route for this page
  },
];

// Interface for data used in TanStack Table and potentially cards if consistent
interface PetDisplayData {
  id: number;
  name: string;
  breed: string;
  type: string;
  owner: string;
  contact: string;
  status: string;
  registered_date: string;
  image_base64: string | null; // Store the raw Base64 string
}

// API response structure
interface ApiPet {
  id: number;
  pet_name: string;
  animal_type: string;
  picture: string | null; // This is the Base64 string from API
  status: string;
  owner: string;
  breed: string;
  contact: string;
  created_at: string;
  // Add mime_type if your API provides it, e.g., mime_type: 'image/jpeg'
}

interface ApiResponse {
  status: string;
  data: ApiPet[];
}

const isLoading = ref(true);
const allFetchedPets = ref<ApiPet[]>([]); // Store raw API data
const searchQuery = ref('');
const statusFilter = ref('all');

// Pagination for cards
const cardsPerPage = 8;
const currentCardPage = ref(1);

// Filter pets based on search and status
const filteredAndSortedPets = computed(() => {
  let filtered = allFetchedPets.value;
  
  if (statusFilter.value !== 'all') {
    filtered = filtered.filter(pet => pet.status.toLowerCase() === statusFilter.value.toLowerCase());
  }
  
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    filtered = filtered.filter(pet =>
      pet.pet_name.toLowerCase().includes(query) ||
      pet.breed.toLowerCase().includes(query) ||
      pet.animal_type.toLowerCase().includes(query) ||
      (pet.owner && pet.owner.toLowerCase().includes(query)) ||
      (pet.contact && pet.contact.toLowerCase().includes(query))
    );
  }
  // Sort by creation date, newest first
  return filtered.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

const totalCardPages = computed(() => Math.ceil(filteredAndSortedPets.value.length / cardsPerPage));

const paginatedCardsData = computed(() => {
  const startIndex = (currentCardPage.value - 1) * cardsPerPage;
  return filteredAndSortedPets.value.slice(startIndex, startIndex + cardsPerPage);
});

// TanStack table configuration
const columnHelper = createColumnHelper<PetDisplayData>();

const columns: ColumnDef<PetDisplayData, any>[] = [
  columnHelper.display({ // Using display for custom rendering
    id: 'image',
    header: 'Image',
    cell: ({ row }) => h('div', { class: 'flex justify-center items-center' }, [
        h('img', { 
            src: row.original.image_base64 ? `data:image/jpeg;base64,${row.original.image_base64}` : 'https://placehold.co/60x60?text=N/A',
            alt: row.original.name,
            class: 'w-12 h-12 object-cover rounded',
            onError: (e: Event) => { (e.target as HTMLImageElement).src = 'https://placehold.co/60x60?text=Error'; }
        })
    ]),
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
  columnHelper.accessor('owner', {
    header: 'Owner',
    cell: info => info.getValue(),
  }),
    columnHelper.accessor('contact', {
    header: 'Contact',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    cell: info => h(Badge, { class: getStatusColor(info.getValue()) + ' capitalize' }, () => info.getValue()),
  }),
  columnHelper.accessor('registered_date', {
    header: 'Registered',
    cell: info => info.getValue(),
  }),
];

// Data for the table, derived and formatted from filteredAndSortedPets
const tableData = computed<PetDisplayData[]>(() => {
  return filteredAndSortedPets.value.map(apiPet => ({
    id: apiPet.id,
    name: apiPet.pet_name,
    breed: apiPet.breed,
    type: apiPet.animal_type,
    owner: apiPet.owner,
    contact: apiPet.contact,
    status: apiPet.status,
    registered_date: new Date(apiPet.created_at).toLocaleDateString(),
    image_base64: apiPet.picture, // This is the raw Base64 string
  }));
});

const table = useVueTable({
  get data() {
    return tableData.value; // Use the derived tableData
  },
  columns,
  getCoreRowModel: getCoreRowModel(),
  getFilteredRowModel: getFilteredRowModel(), // Not strictly needed if filtering outside table
  getPaginationRowModel: getPaginationRowModel(),
  getSortedRowModel: getSortedRowModel(),
  // Tanstack table's global filter can be used if you prefer its filtering logic
  // state: {
  //   get globalFilter() { return searchQuery.value; },
  // },
});

onMounted(() => {
  table.setPageSize(10);
  fetchPets();
});

const fetchPets = async () => {
  isLoading.value = true;
  try {
    // Use the correct API endpoint for fetching registered animals
    const response = await axios.get<ApiResponse>('/api/mobileregisteredanimals');
    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      allFetchedPets.value = response.data.data;
    } else {
      allFetchedPets.value = [];
      console.warn('API did not return expected data structure:', response.data);
    }
  } catch (error) {
    console.error('Failed to fetch registered pets:', error);
    allFetchedPets.value = [];
  } finally {
    isLoading.value = false;
  }
};

const getPageNumbers = computed(() => {
  const total = totalCardPages.value;
  const current = currentCardPage.value;
  const maxVisible = 5;
  const delta = Math.floor(maxVisible / 2);

  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const range = {
    start: Math.max(1, current - delta),
    end: Math.min(total, current + delta),
  };

  if (range.start === 1 && range.end < total) {
      range.end = Math.min(total, range.start + maxVisible -1);
  }
  if (range.end === total && range.start > 1) {
      range.start = Math.max(1, range.end - maxVisible + 1);
  }


  const pages: (number | string)[] = [];
  if (range.start > 1) {
    pages.push(1);
    if (range.start > 2) {
      pages.push('ellipsis-start');
    }
  }

  for (let i = range.start; i <= range.end; i++) {
    pages.push(i);
  }

  if (range.end < total) {
    if (range.end < total - 1) {
      pages.push('ellipsis-end');
    }
    pages.push(total);
  }
  return pages;
});

const getStatusColor = (status: string) => {
  if (!status) return 'bg-gray-100 text-gray-800 border-gray-300';
  switch (status.toLowerCase()) {
    case 'active': return 'bg-green-100 text-green-800 border-green-300';
    case 'pending': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    case 'inactive': return 'bg-red-100 text-red-800 border-red-300';
    default: return 'bg-gray-100 text-gray-800 border-gray-300';
  }
};

const navigateToRegisterPet = () => {
  router.get('/pets/register'); // Adjust if your route is different
};

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
          <Button @click="navigateToRegisterPet" class="gap-2">
            <Icon name="Plus" class="h-4 w-4" />
            Register New Pet
          </Button>
        </div>
        
        <Tabs default-value="Cards" @update:modelValue="currentCardPage = 1"> <!-- Reset card page on tab change -->
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
              
              <div class="flex gap-2 flex-wrap"> <!-- Added flex-wrap for smaller screens -->
                <Button @click="statusFilter = 'all'; currentCardPage = 1" 
                        :variant="statusFilter === 'all' ? 'default' : 'outline'" 
                        size="sm" 
                        class="text-xs">
                  All
                </Button>
                <Button @click="statusFilter = 'active'; currentCardPage = 1" 
                        :variant="statusFilter === 'active' ? 'default' : 'outline'" 
                        size="sm" 
                        class="text-xs">
                  Active
                </Button>
                <Button @click="statusFilter = 'pending'; currentCardPage = 1" 
                        :variant="statusFilter === 'pending' ? 'default' : 'outline'" 
                        size="sm" 
                        class="text-xs">
                  Pending
                </Button>
                <Button @click="statusFilter = 'inactive'; currentCardPage = 1"
                        :variant="statusFilter === 'inactive' ? 'default' : 'outline'" 
                        size="sm" 
                        class="text-xs">
                  Inactive
                </Button>
              </div>
            </div>

            <div class="w-full sm:w-64">
              <Input v-model="searchQuery" @input="currentCardPage = 1" placeholder="Search pets..." class="w-full" />
            </div>
          </div>
          
          <!-- Cards View -->
          <TabsContent value="Cards">
            <div v-if="isLoading" class="flex justify-center items-center h-64">
              <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
            </div>
            
            <div v-else-if="filteredAndSortedPets.length === 0" class="flex justify-center items-center h-64">
              <div class="text-center">
                <Icon name="PawPrint" class="mx-auto h-12 w-12 text-muted-foreground" />
                <h3 class="text-lg font-medium mt-4">No Pets Found</h3>
                <p class="text-muted-foreground mt-2">Try adjusting your filters or register a new pet.</p>
                <Button class="mt-4 gap-2" @click="navigateToRegisterPet">
                  <Icon name="Plus" class="h-4 w-4" />
                  Register New Pet
                </Button>
              </div>
            </div>
            
            <div v-else>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                <!-- Use paginatedCardsData which is derived from filteredAndSortedPets -->
                <Card 
                  v-for="pet in paginatedCardsData" 
                  :key="pet.id" 
                  class="h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200 ease-in-out"
                >
                  <div class="relative">
                    <img 
                      :src="pet.picture ? `data:image/jpeg;base64,${pet.picture}` : 'https://placehold.co/300x300/E0E0E0/757575?text=No+Image'" 
                      :alt="pet.pet_name" 
                      class="w-full aspect-square object-cover bg-muted" 
                      @error="(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/E0E0E0/BDBDBD?text=Load+Error'"
                    />
                    <div class="absolute top-2 right-2">
                      <Badge :class="getStatusColor(pet.status)" class="capitalize shadow-sm">
                        {{ pet.status }}
                      </Badge>
                    </div>
                  </div>
                  
                  <CardHeader class="pb-2 pt-3">
                    <div class="flex justify-between items-start">
                      <CardTitle class="text-lg font-semibold">{{ pet.pet_name }}</CardTitle>
                      <Badge variant="outline" class="ml-2 text-xs capitalize">
                        {{ pet.animal_type }}
                      </Badge>
                    </div>
                    <p class="text-sm text-muted-foreground">{{ pet.breed }}</p>
                  </CardHeader>
                  
                  <CardContent class="flex-grow py-2 text-sm">
                    <div class="space-y-1.5">
                      <div class="flex justify-between">
                        <span class="text-muted-foreground">Registered:</span>
                        <span>{{ new Date(pet.created_at).toLocaleDateString() }}</span>
                      </div>
                      <div class="flex justify-between">
                        <span class="text-muted-foreground">Contact:</span>
                        <span class="truncate" :title="pet.contact || 'N/A'">{{ pet.contact || 'N/A' }}</span>
                      </div>
                    </div>
                  </CardContent>
                  
                  <CardFooter class="pt-2 border-t">
                    <div class="flex items-center w-full">
                      <Avatar class="h-8 w-8 mr-2 border">
                        <AvatarImage v-if="false" src="placeholder_owner_avatar.png" /> <!-- If you have owner avatars -->
                        <AvatarFallback>
                          {{ pet.owner?.split(' ').map(n => n[0]).join('').toUpperCase() || 'O' }}
                        </AvatarFallback>
                      </Avatar>
                      <div class="flex-grow overflow-hidden">
                        <p class="text-sm font-medium truncate" :title="pet.owner">{{ pet.owner }}</p>
                        <p class="text-xs text-muted-foreground">Owner</p>
                      </div>
                      <Button variant="ghost" size="icon" class="h-8 w-8">
                        <Icon name="MoreVertical" class="h-4 w-4" />
                        <span class="sr-only">More options</span>
                      </Button>
                    </div>
                  </CardFooter>
                </Card>
              </div>

              <div class="flex justify-center mt-6" v-if="filteredAndSortedPets.length > cardsPerPage">
                <Pagination>
                  <PaginationContent class="flex gap-1 sm:gap-2">
                    <PaginationPrevious 
                      @click="currentCardPage > 1 && (currentCardPage--)" 
                      :class="{ 'opacity-50 cursor-not-allowed': currentCardPage === 1 }" 
                    />
                    <template v-for="(page, index) in getPageNumbers" :key="`card-page-${index}`">
                      <PaginationItem v-if="typeof page === 'number'" :value="page">
                        <Button 
                          class="h-9 w-9 sm:h-10 sm:w-10 text-xs sm:text-sm" 
                          :variant="page === currentCardPage ? 'default' : 'outline'"
                          @click="currentCardPage = page"
                        >
                          {{ page }}
                        </Button>
                      </PaginationItem>
                      <PaginationEllipsis v-else :key="`card-ellipsis-${page}-${index}`" />
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
                
                <div v-else-if="tableData.length === 0" class="flex justify-center items-center h-32">
                  <div class="text-center">
                    <Icon name="PawPrint" class="mx-auto h-8 w-8 text-muted-foreground" />
                    <h3 class="text-base font-medium mt-2">No Pets Found</h3>
                    <p class="text-sm text-muted-foreground mt-1">Try adjusting your filters or register a new pet.</p>
                  </div>
                </div>
                
                <div v-else class="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                        <TableHead v-for="header in headerGroup.headers" :key="header.id" 
                                   :style="{ width: header.getSize() !== 150 ? `${header.getSize()}px` : undefined }"
                                   class="text-center"
                                   @click="header.column.getToggleSortingHandler()?.($event)">
                          <FlexRender v-if="header.isPlaceholder" :render="header.placeholder" :props="header.getContext()" />
                          <FlexRender v-else :render="header.column.columnDef.header" :props="header.getContext()" />
                          <template v-if="header.column.getCanSort()">
                            <Icon name="ArrowUpDown" v-if="!header.column.getIsSorted()" class="ml-2 h-3 w-3 inline-block" />
                            <Icon name="ArrowUp" v-if="header.column.getIsSorted() === 'asc'" class="ml-2 h-3 w-3 inline-block" />
                            <Icon name="ArrowDown" v-if="header.column.getIsSorted() === 'desc'" class="ml-2 h-3 w-3 inline-block" />
                          </template>
                        </TableHead>
                        <TableHead class="w-[100px] text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow v-for="row in table.getRowModel().rows" :key="row.id" class="hover:bg-muted/50">
                        <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="text-center py-2 px-3">
                           <FlexRender :render="cell.column.columnDef.cell" :props="cell.getContext()" />
                        </TableCell>
                        <TableCell class="text-center py-2 px-3">
                          <div class="flex items-center justify-center space-x-1">
                            <Button variant="ghost" size="icon" class="h-8 w-8">
                              <Icon name="Edit" class="h-4 w-4" />
                              <span class="sr-only">Edit</span>
                            </Button>
                            <Button variant="ghost" size="icon" class="h-8 w-8">
                              <Icon name="Eye" class="h-4 w-4" />
                              <span class="sr-only">View</span>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    </TableBody>
                    <TableCaption v-if="tableData.length > 0">
                      Showing {{ table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1 }}
                      to {{ Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                        tableData.length) }}
                      of {{ tableData.length }} results.
                    </TableCaption>
                  </Table>

                  <div class="flex items-center justify-end space-x-2 py-4" v-if="table.getPageCount() > 1">
                    <Button 
                      @click="table.previousPage()" 
                      :disabled="!table.getCanPreviousPage()" 
                      variant="outline"
                      size="sm"
                    >
                      <Icon name="ChevronLeft" class="h-4 w-4 mr-1 sm:mr-2" />
                      Previous
                    </Button>
                    <span class="text-sm text-muted-foreground">
                      Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }}
                    </span>
                    <Button 
                      @click="table.nextPage()" 
                      :disabled="!table.getCanNextPage()" 
                      variant="outline" 
                      size="sm"
                    >
                      Next
                      <Icon name="ChevronRight" class="h-4 w-4 ml-1 sm:ml-2" />
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
<!-- </template> -->