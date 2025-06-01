<script setup lang="ts">
import AppLayout from '@/layouts/MobileAppLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import { ref, computed } from 'vue';
import { toast } from 'vue-sonner'
import { type BreadcrumbItem } from '@/types';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle,
} from '@/components/ui/dialog';
import Icon from '@/components/Icon.vue';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Pets',
    href: '/pets',
  },
  {
    title: 'Register Pet',
    href: '/pets/register',
  },
];

// Form state - now includes additional pictures and location
const form = useForm({
  pet_name: '',
  animal_type: '',
  breed: '',
  contact: '',
  picture: null as string | null, // Main picture
  picture_2: null as string | null, // Additional picture 1
  picture_3: null as string | null, // Additional picture 2
  location: '',
  latitude: null as number | null,
  longitude: null as number | null,
});

// UI state
const isUploading = ref(false);
const error = ref('');
const showConfirmDialog = ref(false);
const showLocationModal = ref(false);
const imagePreview = ref('');
const imagePreview2 = ref('');
const imagePreview3 = ref('');
const isLoadingLocation = ref(false);

// Location picker state
const searchQuery = ref('');
const searchResults = ref<Array<{
  display_name: string;
  lat: string;
  lon: string;
  address: any;
}>>([]);
const isSearching = ref(false);

const isFormValid = computed(() => {
  return form.pet_name && 
         form.animal_type && 
         form.breed && 
         form.contact && 
         form.picture &&
         form.location;
});

const isSubmitting = computed(() => {
  return isUploading.value;
});

// Helper function to handle image selection
const handleImageSelect = async (event: Event, imageType: 'main' | 'second' | 'third') => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  const maxSizeInBytes = 2 * 1024 * 1024; 
  
  if (file.size > maxSizeInBytes) {
    error.value = 'Image is too large. Maximum size is 2MB.';
    toast.error(error.value);
    
    // Reset the specific image
    if (imageType === 'main') {
      imagePreview.value = '';
      form.picture = null;
    } else if (imageType === 'second') {
      imagePreview2.value = '';
      form.picture_2 = null;
    } else if (imageType === 'third') {
      imagePreview3.value = '';
      form.picture_3 = null;
    }
    
    if (input) input.value = '';
    return;
  }
  
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    const base64 = result.includes(',') ? result.split(',')[1] : result;
    
    if (imageType === 'main') {
      imagePreview.value = result;
      form.picture = base64;
    } else if (imageType === 'second') {
      imagePreview2.value = result;
      form.picture_2 = base64;
    } else if (imageType === 'third') {
      imagePreview3.value = result;
      form.picture_3 = base64;
    }
  };
  
  reader.onerror = () => {
    error.value = "Could not read the image file.";
    toast.error(error.value);
    
    if (imageType === 'main') {
      form.picture = null;
      imagePreview.value = '';
    } else if (imageType === 'second') {
      form.picture_2 = null;
      imagePreview2.value = '';
    } else if (imageType === 'third') {
      form.picture_3 = null;
      imagePreview3.value = '';
    }
  }
  
  reader.readAsDataURL(file);
  error.value = ''; 
};

// Location functions
const getCurrentLocation = () => {
  if (!navigator.geolocation) {
    toast.error('Geolocation is not supported by this browser.');
    return;
  }
  
  isLoadingLocation.value = true;
  
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      form.latitude = latitude;
      form.longitude = longitude;
      
      try {
        // Reverse geocoding to get address
        const response = await axios.get(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
        form.location = response.data.display_name;
        toast.success('Location detected successfully!');
      } catch (err) {
        form.location = `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
        toast.success('Location coordinates saved!');
      }
      
      isLoadingLocation.value = false;
    },
    (error) => {
      isLoadingLocation.value = false;
      toast.error('Unable to retrieve your location. Please search manually.');
    }
  );
};

const searchLocation = async () => {
  if (!searchQuery.value.trim()) return;
  
  isSearching.value = true;
  
  try {
    const response = await axios.get(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery.value)}&limit=5`);
    searchResults.value = response.data;
  } catch (err) {
    toast.error('Failed to search locations. Please try again.');
  }
  
  isSearching.value = false;
};

const selectLocation = (location: any) => {
  form.location = location.display_name;
  form.latitude = parseFloat(location.lat);
  form.longitude = parseFloat(location.lon);
  showLocationModal.value = false;
  searchQuery.value = '';
  searchResults.value = [];
  toast.success('Location selected successfully!');
};

const handleSubmit = () => {
  if (!isFormValid.value) {
    error.value = 'Please fill in all required fields, upload at least one pet photo, and select a location.';
    toast.warning(error.value);
    return;
  }
  showConfirmDialog.value = true;
};

const confirmSubmit = async () => {
  isUploading.value = true;
  form.processing = true;
  error.value = '';
  
  const payload = {
    pet_name: form.pet_name,
    animal_type: form.animal_type,
    breed: form.breed,
    contact: form.contact,
    picture: form.picture,
    picture_2: form.picture_2,
    picture_3: form.picture_3,
    location: form.location,
    latitude: form.latitude,
    longitude: form.longitude,
  };

  try {
    const response = await axios.post('/api/mobileregisteredanimals', payload);

    if (response.data && response.data.status === 'success') {
      toast.success(response.data.message || "Your pet has been registered successfully.");
      form.reset();
      imagePreview.value = '';
      imagePreview2.value = '';
      imagePreview3.value = '';
      showConfirmDialog.value = false;
    } else {
      const apiMessage = response.data?.message || "Registration failed with an unexpected server response.";
      error.value = apiMessage;
      toast.error(apiMessage);
    }

  } catch (axiosError: any) {
    console.error('Registration Axios Error:', axiosError);
    let errorMessage = "Failed to register pet. Please try again.";

    if (axiosError.response) {
      if (axiosError.response.data) {
        if (axiosError.response.data.errors) {
          errorMessage = Object.values(axiosError.response.data.errors).flat().join(' ');
        } else if (axiosError.response.data.message) {
          errorMessage = axiosError.response.data.message;
        } else {
          errorMessage = `Error ${axiosError.response.status}: An unexpected server error occurred.`;
        }
      } else {
        errorMessage = `Error ${axiosError.response.status}: Server error.`;
      }
    } else if (axiosError.request) {
      errorMessage = "No response from server. Please check your network connection.";
    } else {
      errorMessage = axiosError.message || "An unknown error occurred during registration.";
    }
    
    error.value = errorMessage;
    toast.error(errorMessage);
  } finally {
    isUploading.value = false;
    form.processing = false;
  }
};

const petTypes = [
  { value: 'Dog', label: 'Dog' },
  { value: 'Cat', label: 'Cat' },
];
</script>

<template>
  <Head title="Register Pet" />
  <AppLayout>
    <div class="container mx-auto py-8 px-4">
      <div class="max-w-3xl mx-auto">
        <Card class="shadow-lg">
          <CardHeader class="pb-3">
            <CardTitle class="text-2xl font-bold text-center">Register Your Pet</CardTitle>
            <CardDescription class="text-center">
              Add your pet to our registry to help keep them safe and identifiable
            </CardDescription>
          </CardHeader>
          
          <CardContent>
            <Form @submit.prevent="handleSubmit">
              <!-- Image Upload Section -->
              <div class="mb-8">
                <div class="flex flex-col items-center">
                  <!-- Main Image Upload -->
                  <div class="relative mb-4 group">
                    <div 
                      class="w-48 h-48 rounded-full flex items-center justify-center overflow-hidden border-4 border-primary shadow-lg hover:opacity-90 transition-opacity"
                      :class="{ 'bg-muted': !imagePreview }"
                    >
                      <img 
                        v-if="imagePreview" 
                        :src="imagePreview" 
                        alt="Pet preview" 
                        class="w-full h-full object-cover" 
                      />
                      <div v-else class="text-center p-4">
                        <Icon name="Camera" class="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                        <span class="text-sm text-muted-foreground font-medium">Main Pet Photo</span>
                      </div>
                    </div>
                    <Label 
                      for="pet-image-main" 
                      class="absolute bottom-0 right-0 p-3 rounded-full bg-primary text-white shadow cursor-pointer"
                    >
                      <Icon name="Plus" class="h-5 w-5" />
                    </Label>
                    <input 
                      type="file" 
                      id="pet-image-main"
                      accept="image/jpeg, image/png, image/gif" 
                      class="hidden" 
                      @change="(e) => handleImageSelect(e, 'main')" 
                      :disabled="isSubmitting"
                    />
                  </div>
                  
                  <!-- Additional Images -->
                  <div class="flex gap-4 mb-4">
                    <!-- Second Image -->
                    <div class="relative group">
                      <div 
                        class="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden border-2 border-muted shadow hover:opacity-90 transition-opacity"
                        :class="{ 'bg-muted': !imagePreview2 }"
                      >
                        <img 
                          v-if="imagePreview2" 
                          :src="imagePreview2" 
                          alt="Pet preview 2" 
                          class="w-full h-full object-cover" 
                        />
                        <div v-else class="text-center p-2">
                          <Icon name="Camera" class="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                          <span class="text-xs text-muted-foreground">Photo 2</span>
                        </div>
                      </div>
                      <Label 
                        for="pet-image-2" 
                        class="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white shadow cursor-pointer"
                      >
                        <Icon name="Plus" class="h-3 w-3" />
                      </Label>
                      <input 
                        type="file" 
                        id="pet-image-2"
                        accept="image/jpeg, image/png, image/gif" 
                        class="hidden" 
                        @change="(e) => handleImageSelect(e, 'second')" 
                        :disabled="isSubmitting"
                      />
                    </div>
                    
                    <!-- Third Image -->
                    <div class="relative group">
                      <div 
                        class="w-24 h-24 rounded-lg flex items-center justify-center overflow-hidden border-2 border-muted shadow hover:opacity-90 transition-opacity"
                        :class="{ 'bg-muted': !imagePreview3 }"
                      >
                        <img 
                          v-if="imagePreview3" 
                          :src="imagePreview3" 
                          alt="Pet preview 3" 
                          class="w-full h-full object-cover" 
                        />
                        <div v-else class="text-center p-2">
                          <Icon name="Camera" class="h-6 w-6 mx-auto mb-1 text-muted-foreground" />
                          <span class="text-xs text-muted-foreground">Photo 3</span>
                        </div>
                      </div>
                      <Label 
                        for="pet-image-3" 
                        class="absolute -bottom-1 -right-1 p-1.5 rounded-full bg-primary text-white shadow cursor-pointer"
                      >
                        <Icon name="Plus" class="h-3 w-3" />
                      </Label>
                      <input 
                        type="file" 
                        id="pet-image-3"
                        accept="image/jpeg, image/png, image/gif" 
                        class="hidden" 
                        @change="(e) => handleImageSelect(e, 'third')" 
                        :disabled="isSubmitting"
                      />
                    </div>
                  </div>
                  
                  <p class="text-sm text-muted-foreground text-center">
                    Upload multiple photos to help identify your pet from different angles
                  </p>
                  
                  <div v-if="error" class="w-full max-w-md mt-2">
                    <Alert variant="destructive">
                      <Icon name="AlertCircle" class="h-4 w-4" />
                      <AlertTitle>Error</AlertTitle>
                      <AlertDescription>{{ error }}</AlertDescription>
                    </Alert>
                  </div>
                </div>
              </div>
              
              <!-- Pet Information Form -->
              <div class="space-y-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField name="pet_name" v-slot="{ componentField, meta }">
                    <FormItem>
                      <FormLabel>Pet Name <span class="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="Enter your pet's name"
                          v-model="form.pet_name" 
                          :disabled="isSubmitting"
                          required
                          :aria-invalid="meta.touched && !meta.valid"
                        />
                      </FormControl>
                      <FormMessage v-if="form.errors.pet_name">{{ form.errors.pet_name }}</FormMessage>
                    </FormItem>
                  </FormField>
                  
                  <FormField name="animal_type" v-slot="{ componentField, meta }">
                    <FormItem>
                      <FormLabel>Pet Type <span class="text-red-500">*</span></FormLabel>
                      <Select v-model="form.animal_type" :disabled="isSubmitting">
                        <FormControl>
                          <SelectTrigger :aria-invalid="meta.touched && !meta.valid">
                            <SelectValue placeholder="Select pet type" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem v-for="type in petTypes" :key="type.value" :value="type.value">
                            {{ type.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage v-if="form.errors.animal_type">{{ form.errors.animal_type }}</FormMessage>
                    </FormItem>
                  </FormField>
                  
                  <FormField name="breed" v-slot="{ componentField, meta }">
                    <FormItem>
                      <FormLabel>Breed <span class="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="Enter breed" 
                          v-model="form.breed" 
                          :disabled="isSubmitting"
                          required
                          :aria-invalid="meta.touched && !meta.valid"
                        />
                      </FormControl>
                      <FormMessage v-if="form.errors.breed">{{ form.errors.breed }}</FormMessage>
                    </FormItem>
                  </FormField>
                  
                  <FormField name="contact" v-slot="{ componentField, meta }">
                    <FormItem>
                      <FormLabel>Contact Number <span class="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="Your contact number" 
                          v-model="form.contact" 
                          :disabled="isSubmitting"
                          required
                          :aria-invalid="meta.touched && !meta.valid"
                        />
                      </FormControl>
                      <FormDescription>
                        This will be displayed on your pet's profile for contact purposes
                      </FormDescription>
                      <FormMessage v-if="form.errors.contact">{{ form.errors.contact }}</FormMessage>
                    </FormItem>
                  </FormField>
                </div>
                
                <!-- Location Field -->
                <FormField name="location" v-slot="{ componentField, meta }">
                  <FormItem>
                    <FormLabel>Location <span class="text-red-500">*</span></FormLabel>
                    <div class="flex gap-2">
                      <FormControl class="flex-1">
                        <Input 
                          type="text"
                          placeholder="Pet's location" 
                          v-model="form.location" 
                          :disabled="isSubmitting"
                          readonly
                          required
                          :aria-invalid="meta.touched && !meta.valid"
                        />
                      </FormControl>
                      <Button 
                        type="button" 
                        variant="outline" 
                        @click="getCurrentLocation"
                        :disabled="isSubmitting || isLoadingLocation"
                        class="shrink-0"
                      >
                        <Icon name="MapPin" class="h-4 w-4 mr-2" />
                        <span v-if="isLoadingLocation">Getting...</span>
                        <span v-else>Current</span>
                      </Button>
                      <Button 
                        type="button" 
                        variant="outline" 
                        @click="showLocationModal = true"
                        :disabled="isSubmitting"
                        class="shrink-0"
                      >
                        <Icon name="Search" class="h-4 w-4 mr-2" />
                        Search
                      </Button>
                    </div>
                    <FormDescription>
                      Location helps others know where your pet was last seen
                    </FormDescription>
                    <FormMessage v-if="form.errors.location">{{ form.errors.location }}</FormMessage>
                  </FormItem>
                </FormField>
              </div>
            </Form>
          </CardContent>
          
          <CardFooter class="flex justify-center pt-3">
            <Button 
              size="lg" 
              class="w-full sm:w-auto px-8 gap-2" 
              :disabled="isSubmitting || !isFormValid" 
              @click="handleSubmit"
            >
              <Icon name="CheckCircle" class="h-5 w-5" />
              Register Pet
              <span v-if="isSubmitting" class="ml-2">
                <Icon name="Loader2" class="h-4 w-4 animate-spin" />
              </span>
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
    
    <!-- Location Picker Modal -->
    <Dialog v-model:open="showLocationModal">
      <DialogContent class="max-w-md">
        <DialogHeader>
          <DialogTitle>Select Location</DialogTitle>
          <DialogDescription>
            Search for your pet's location or use current location
          </DialogDescription>
        </DialogHeader>
        <div class="space-y-4">
          <div class="flex gap-2">
            <Input 
              v-model="searchQuery" 
              placeholder="Search for a location..." 
              @keyup.enter="searchLocation"
              class="flex-1"
            />
            <Button @click="searchLocation" :disabled="isSearching" variant="outline">
              <Icon name="Search" class="h-4 w-4" />
            </Button>
          </div>
          
          <div class="text-center">
            <Button 
              @click="getCurrentLocation" 
              :disabled="isLoadingLocation"
              variant="outline"
              class="w-full"
            >
              <Icon name="MapPin" class="h-4 w-4 mr-2" />
              <span v-if="isLoadingLocation">Getting Current Location...</span>
              <span v-else>Use Current Location</span>
            </Button>
          </div>
          
          <div v-if="searchResults.length > 0" class="max-h-60 overflow-y-auto space-y-2">
            <div 
              v-for="(result, index) in searchResults" 
              :key="index"
              @click="selectLocation(result)"
              class="p-3 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
            >
              <div class="font-medium text-sm">{{ result.display_name }}</div>
            </div>
          </div>
          
          <div v-if="isSearching" class="text-center py-4">
            <Icon name="Loader2" class="h-6 w-6 animate-spin mx-auto mb-2" />
            <p class="text-sm text-muted-foreground">Searching locations...</p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showLocationModal = false">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
    
    <!-- Confirmation Dialog -->
    <Dialog v-model:open="showConfirmDialog">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Registration</DialogTitle>
          <DialogDescription>
            Are you sure you want to register your pet with the following information?
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-4">
          <div class="grid grid-cols-3 items-center gap-4">
            <span class="font-medium">Pet Name:</span>
            <span class="col-span-2">{{ form.pet_name }}</span>
          </div>
          <div class="grid grid-cols-3 items-center gap-4">
            <span class="font-medium">Pet Type:</span>
            <span class="col-span-2">{{ form.animal_type }}</span>
          </div>
          <div class="grid grid-cols-3 items-center gap-4">
            <span class="font-medium">Breed:</span>
            <span class="col-span-2">{{ form.breed }}</span>
          </div>
          <div class="grid grid-cols-3 items-center gap-4">
            <span class="font-medium">Contact:</span>
            <span class="col-span-2">{{ form.contact }}</span>
          </div>
          <div class="grid grid-cols-3 items-center gap-4">
            <span class="font-medium">Location:</span>
            <span class="col-span-2 text-sm">{{ form.location }}</span>
          </div>
          <div class="flex justify-center mt-2 gap-2">
            <div class="w-24 h-24 rounded-lg overflow-hidden border border-muted">
              <img 
                v-if="imagePreview" 
                :src="imagePreview" 
                alt="Pet preview" 
                class="w-full h-full object-cover" 
              />
            </div>
            <div v-if="imagePreview2" class="w-16 h-16 rounded overflow-hidden border border-muted">
              <img :src="imagePreview2" alt="Pet preview 2" class="w-full h-full object-cover" />
            </div>
            <div v-if="imagePreview3" class="w-16 h-16 rounded overflow-hidden border border-muted">
              <img :src="imagePreview3" alt="Pet preview 3" class="w-full h-full object-cover" />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="showConfirmDialog = false" :disabled="isSubmitting">
            Cancel
          </Button>
          <Button @click="confirmSubmit" :disabled="isSubmitting" class="gap-2">
            <Icon name="CheckCircle" class="h-4 w-4" />
            Confirm
            <span v-if="isSubmitting" class="ml-2">
              <Icon name="Loader2" class="h-4 w-4 animate-spin" />
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>

<style scoped>
.text-red {
  color: #ef4444;
}
</style>