<script setup lang="ts">
import AppLayout from '@/layouts/MobileAppLayout.vue'; // Assuming this layout is mobile-friendly or you adapt it
import { Head, router } from '@inertiajs/vue3';
import { ref, onMounted, computed } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import Icon from '@/components/Icon.vue';
import axios from 'axios';
import {toast} from 'vue-sonner';

// Simplified Breadcrumbs
const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'My Pets',
    href: '/my-pets', // Adjust if your Inertia route name is different
  },
];

// Interface for API pet data
interface ApiPet {
  id: number;
  pet_name: string;
  animal_type: string;
  picture: string | null; // Base64 string
  status: string;
  owner: string; // User's name, kept for display if needed
  breed: string;
  contact: string;
  created_at: string;
}

interface ApiResponse {
  status: string;
  data: ApiPet[];
  message?: string; // For error messages
}

const isLoading = ref(true);
const myPets = ref<ApiPet[]>([]);

// Pagination for cards (optional, can be simplified further)
const cardsPerPage = 6; // Adjust for mobile screen
const currentCardPage = ref(1);

// Pets are already filtered by user from backend, so we just sort them here
const sortedPets = computed(() => {
  // Sort by creation date, newest first
  return [...myPets.value].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
});

const totalCardPages = computed(() => Math.ceil(sortedPets.value.length / cardsPerPage));

const paginatedPetsData = computed(() => {
  const startIndex = (currentCardPage.value - 1) * cardsPerPage;
  return sortedPets.value.slice(startIndex, startIndex + cardsPerPage);
});

onMounted(() => {
  fetchMyPetsData();
});

const fetchMyPetsData = async () => {
  isLoading.value = true;
  try {
    // Use the new API endpoint for fetching current user's pets
    const response = await axios.get<ApiResponse>('/my-pets'); // <<< UPDATED ENDPOINT
    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      myPets.value = response.data.data;
    } else {
      myPets.value = [];
      console.warn('API did not return expected data structure or had an error:', response.data);
      // Optionally, show a user-friendly error message from response.data.message
    }
  } catch (error: any) {
    console.error('Failed to fetch my pets:', error);
    myPets.value = [];
    if (error.response && error.response.status === 401) {
      // Handle unauthenticated state, e.g., redirect to login
      // router.visit('/login'); // Example for Inertia
      toast.error('You are not logged in. Please login to see your pets.');
    } else {
      toast.info('Could not load your pets. Please try again later.');
    }
  } finally {
    isLoading.value = false;
  }
};

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
  router.get('/registeredpetsmobile'); // Adjust if your route is different
};

// Simplified pagination display logic
const getPageNumbers = computed(() => {
  const total = totalCardPages.value;
  const current = currentCardPage.value;
  const maxVisible = 3; // Fewer buttons for mobile
  const delta = Math.floor(maxVisible / 2);

  if (total <= maxVisible) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  let start = Math.max(1, current - delta);
  let end = Math.min(total, current + delta);
  
  if (current - delta < 1) {
    end = Math.min(total, start + maxVisible -1);
  }
  if (current + delta > total) {
    start = Math.max(1, end - maxVisible + 1);
  }

  const pages: (number | string)[] = [];
  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push('...');
  }
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  if (end < total) {
    if (end < total - 1) pages.push('...');
    pages.push(total);
  }
  return pages;
});

</script>

<template>
  <Head title="My Pets" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="container mx-auto py-4 px-2 sm:px-4"> 
      <div class="flex flex-col gap-4">
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h1 class="text-xl sm:text-2xl font-bold tracking-tight">My Pets</h1>
            <p class="text-sm text-muted-foreground">View and manage your registered companions.</p>
          </div>
          <Button @click="navigateToRegisterPet" class="gap-2 w-full sm:w-auto">
            <Icon name="Plus" class="h-4 w-4" />
            Register New Pet
          </Button>
        </div>
        
        <!-- Pets Display Area -->
        <div>
          <div v-if="isLoading" class="flex justify-center items-center h-64">
            <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
          
          <div v-else-if="sortedPets.length === 0" class="flex justify-center items-center h-64">
            <div class="text-center p-4">
              <Icon name="PawPrint" class="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 class="text-lg font-medium mt-4">No Pets Yet!</h3>
              <p class="text-muted-foreground mt-2">Looks like you haven't registered any pets.</p>
              <Button class="mt-4 gap-2" @click="navigateToRegisterPet">
                <Icon name="Plus" class="h-4 w-4" />
                Register Your First Pet
              </Button>
            </div>
          </div>
          
          <div v-else>
            <!-- Grid for pet cards, 1 column on small, 2 on medium+, etc. -->
            <div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <Card 
                v-for="pet in paginatedPetsData" 
                :key="pet.id" 
                class="flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200 ease-in-out"
              >
                <div class="relative">
                  <img 
                    :src="pet.picture ? `data:image/jpeg;base64,${pet.picture}` : 'https://placehold.co/300x300/E0E0E0/757575?text=No+Image'" 
                    :alt="pet.pet_name" 
                    class="w-full aspect-square object-cover bg-muted" 
                    @error="(e) => (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/E0E0E0/BDBDBD?text=Load+Error'"
                  />
                  <div class="absolute top-2 right-2">
                    <Badge :class="getStatusColor(pet.status) + ' shadow-sm capitalize'">
                      {{ pet.status }}
                    </Badge>
                  </div>
                </div>
                
                <CardHeader class="pb-2 pt-3 px-3 sm:px-4"> 
                  <div class="flex justify-between items-start">
                    <CardTitle class="text-md sm:text-lg font-semibold truncate" :title="pet.pet_name">{{ pet.pet_name }}</CardTitle>
                    <Badge variant="outline" class="ml-2 text-xs capitalize shrink-0">
                      {{ pet.animal_type }}
                    </Badge>
                  </div>
                  <p class="text-xs sm:text-sm text-muted-foreground truncate" :title="pet.breed || 'N/A'">{{ pet.breed || 'N/A' }}</p>
                </CardHeader>
                
                <CardContent class="flex-grow py-2 px-3 sm:px-4 text-xs sm:text-sm">
                  <div class="space-y-1">
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
                
                <CardFooter class="pt-2 pb-3 px-3 sm:px-4 border-t"> 
                  <div class="flex items-center justify-end w-full">
                    <!-- Example: Link to a pet detail page or edit action -->
                    <Button variant="ghost" size="sm" @click="router.get(`/pets/${pet.id}/edit`)"> 
                      <Icon name="Edit3" class="h-3 w-3 sm:h-4 sm:w-4 mr-1" /> Edit
                    </Button>
                     <Button variant="ghost" size="icon" class="h-7 w-7 sm:h-8 sm:w-8 ml-1">
                        <Icon name="MoreVertical" class="h-4 w-4" />
                        <span class="sr-only">More options</span>
                      </Button>
                  </div>
                </CardFooter>
              </Card>
            </div>

            <!-- Simple Pagination for Cards -->
            <div class="flex justify-center mt-6" v-if="sortedPets.length > cardsPerPage && totalCardPages > 1">
              <div class="flex items-center gap-1">
                 <Button 
                    variant="outline" 
                    size="icon" 
                    class="h-8 w-8"
                    @click="currentCardPage > 1 && (currentCardPage--)" 
                    :disabled="currentCardPage === 1"
                  >
                    <Icon name="ChevronLeft" class="h-4 w-4" />
                  </Button>
                <template v-for="(page, index) in getPageNumbers" :key="`card-page-${index}`">
                   <Button 
                      v-if="typeof page === 'number'"
                      class="h-8 w-8" 
                      :variant="page === currentCardPage ? 'default' : 'outline'"
                      @click="currentCardPage = page"
                    >
                      {{ page }}
                    </Button>
                    <span v-else class="px-1 text-muted-foreground">...</span>
                </template>
                 <Button 
                    variant="outline" 
                    size="icon" 
                    class="h-8 w-8"
                    @click="currentCardPage < totalCardPages && (currentCardPage++)" 
                    :disabled="currentCardPage === totalCardPages"
                  >
                    <Icon name="ChevronRight" class="h-4 w-4" />
                  </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>