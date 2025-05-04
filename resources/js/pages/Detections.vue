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

interface Detection {
  id: number;
  name: string;
  type: string;
  detected_at: string;
  image: string;
}

const isLoading = ref(true);
const detections = ref<Detection[]>([]);
const searchQuery = ref('');
const viewMode = ref('cards'); // Instead of using Tabs component

// Pagination for cards
const cardsPerPage = 8;
const currentCardPage = ref(1);
const totalCardPages = computed(() => Math.ceil(filteredDetections.value.length / cardsPerPage));

// Filter detections based on search
const filteredDetections = computed(() => {
  if (!searchQuery.value) return detections.value;

  const query = searchQuery.value.toLowerCase();
  return detections.value.filter(animal =>
    animal.name.toLowerCase().includes(query) ||
    animal.type.toLowerCase().includes(query) ||
    animal.detected_at.toLowerCase().includes(query)
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
  columnHelper.accessor('name', {
    header: 'Name',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('type', {
    header: 'Type',
    cell: info => info.getValue(),
  }),
  columnHelper.accessor('detected_at', {
    header: 'Detected At',
    cell: info => info.getValue(),
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

const dummyData: Detection[] = [
  {
    id: 1,
    name: 'BRUNO',
    type: 'Dog',
    detected_at: '2025-05-03 08:00 AM',
    image: 'https://placehold.co/300x200?text=Dog+1',
  },
  {
    id: 2,
    name: 'MILO',
    type: 'Cat',
    detected_at: '2025-05-03 08:30 AM',
    image: 'https://placehold.co/300x200?text=Cat+1',
  },
  {
    id: 3,
    name: 'MAX',
    type: 'Dog',
    detected_at: '2025-05-03 09:00 AM',
    image: 'https://placehold.co/300x200?text=Dog+2',
  },
  {
    id: 4,
    name: 'LUNA',
    type: 'Cat',
    detected_at: '2025-05-03 09:15 AM',
    image: 'https://placehold.co/300x200?text=Cat+2',
  },
  {
    id: 5,
    name: 'ROCKY',
    type: 'Dog',
    detected_at: '2025-05-03 09:45 AM',
    image: 'https://placehold.co/300x200?text=Dog+3',
  },
  {
    id: 6,
    name: 'BELLA',
    type: 'Dog',
    detected_at: '2025-05-03 10:00 AM',
    image: 'https://placehold.co/300x200?text=Dog+4',
  },
  {
    id: 7,
    name: 'BELLA',
    type: 'Dog',
    detected_at: '2025-05-03 10:00 AM',
    image: 'https://placehold.co/300x200?text=Dog+4',
  },
  {
    id: 8,
    name: 'BELLA',
    type: 'Dog',
    detected_at: '2025-05-03 10:00 AM',
    image: 'https://placehold.co/300x200?text=Dog+4',
  },
  {
    id: 9,
    name: 'BELLA',
    type: 'Dog',
    detected_at: '2025-05-03 10:00 AM',
    image: 'https://placehold.co/300x200?text=Dog+4',
  },
];

// Setup page size for table
onMounted(() => {
  table.setPageSize(10);
});

const fetchDetections = async () => {
  try {
    // Use dummy data directly since the API endpoint seems to be failing
    detections.value = dummyData;

    // The following code is commented out until your API endpoint is working
    /*
    const response = await axios.get('/api/detections');
    const apiData = response.data.map((item: any) => ({
      id: item.id,
      name: item.name?.toUpperCase() ?? 'UNKNOWN',
      type: item.type,
      detected_at: new Date(item.detected_at).toLocaleString(),
      image: item.image || 'https://placehold.co/300x200?text=No+Image',
    }));
    detections.value = apiData.length ? apiData : dummyData;
    */
  } catch (error) {
    console.error('Failed to fetch detections:', error);
    detections.value = dummyData;
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

onMounted(fetchDetections);
</script>

<template>

  <Head title="Detections" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="container mx-auto py-6 px-4">
      <div class="flex flex-col gap-6">


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
            <Input v-model="searchQuery" placeholder="Search animals..." class="w-full sm:w-64" />
          </div>
          <TabsContent value="Cards">
            <div v-if="filteredDetections.length === 0" class="flex justify-center items-center h-64">
              <p class="text-muted-foreground">No detections found</p>
            </div>
            <div v-else>
              <!-- Card Grid -->
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <CardAnimal v-for="animal in paginatedCards" :key="animal.id" :title="animal.name"
                  :imagelink="animal.image" class="h-full">
                  <template #footer>
                    <div class="flex justify-between items-center text-sm">
                      <span class="font-medium">{{ animal.type }}</span>
                      <span class="text-muted-foreground">{{ animal.detected_at }}</span>
                    </div>
                  </template>
                </CardAnimal>
              </div>

              <!-- Cards Pagination -->
              <div class="flex justify-center mt-6">
                <Pagination v-model:page="currentCardPage" :items-per-page="cardsPerPage"
                  :total="filteredDetections.length" v-if="filteredDetections.length > cardsPerPage">
                  <PaginationContent class="flex gap-2">
                    <PaginationPrevious />

                    <template v-for="(page, index) in getPageNumbers" :key="index">
                      <PaginationItem v-if="typeof page === 'number'" :value="page"
                        :is-active="page === currentCardPage">
                        <Button class="h-10 w-10" :variant="page === currentCardPage ? 'default' : 'outline'">
                          {{ page }}
                        </Button>
                      </PaginationItem>
                      <PaginationEllipsis v-else :key="page" :index="index" />
                    </template>

                    <PaginationNext />
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


        <!-- Cards View -->



      </div>
    </div>

  </AppLayout>
</template>