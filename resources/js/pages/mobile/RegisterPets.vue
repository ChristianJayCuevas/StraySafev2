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
import axios from 'axios'; // Make sure axios is imported

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

// Form state - useForm is still great for managing form data and its state
const form = useForm({
  pet_name: '',
  animal_type: '',
  breed: '',
  contact: '',
  picture: null as string | null, // Now 'picture' will hold the Base64 string
  // You could add 'owner' here if it's part of the form
  // owner: '',
});

// UI state
const isUploading = ref(false); // We'll manage this manually with axios
const error = ref('');
const showConfirmDialog = ref(false);
const imagePreview = ref('');

const isFormValid = computed(() => {
  return form.pet_name && 
         form.animal_type && 
         form.breed && 
         form.contact && 
         form.picture;
});

// form.processing from useForm won't be directly used by axios,
// so isUploading is our primary indicator.
const isSubmitting = computed(() => {
  return isUploading.value;
});

const handleImageSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  const file = input.files[0];
  const maxSizeInBytes = 2 * 1024 * 1024; 
  if (file.size > maxSizeInBytes) {
    error.value = 'Image is too large. Maximum size is 2MB.';
    toast.error(error.value);
    imagePreview.value = '';
    form.picture = null;
    if (input) input.value = '';
    return;
  }
  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    imagePreview.value = result;
    if (result.includes(',')) {
        form.picture = result.split(',')[1];
    } else {
        form.picture = result;
    }
  };
  reader.onerror = () => {
    error.value = "Could not read the image file.";
    toast.error(error.value);
    form.picture = null;
    imagePreview.value = '';
  }
  reader.readAsDataURL(file);
  error.value = ''; 
};

const handleSubmit = () => {
  if (!isFormValid.value) {
    error.value = 'Please fill in all required fields and upload a pet photo.';
    toast.warning(error.value);
    return;
  }
  showConfirmDialog.value = true;
};

// MODIFIED confirmSubmit function
const confirmSubmit = async () => { // Make it async
  isUploading.value = true;
  form.processing = true; // You can still set this if other UI elements depend on form.processing
  error.value = '';
  
  // Manually construct the payload from the form object
  // This ensures you only send what the API expects.
  const payload = {
    pet_name: form.pet_name,
    animal_type: form.animal_type,
    breed: form.breed,
    contact: form.contact,
    picture: form.picture, // This is the Base64 string
    // owner: form.owner, // If you added 'owner' to the useForm object
    // status: 'active', // If you want to send a default status
  };

  try {
    // Use axios.post for a standard API request
    // The URL '/api/mobileregisteredanimals' should match your Laravel API route
    const response = await axios.post('/api/mobileregisteredanimals', payload);

    // Check the response from your Laravel API
    // (assuming your API returns { status: 'success', message: '...' })
    if (response.data && response.data.status === 'success') {
      toast.success(response.data.message || "Your pet has been registered successfully.");
      form.reset(); // Reset form fields using useForm's utility
      imagePreview.value = '';
      showConfirmDialog.value = false;
    } else {
      // Handle cases where API call was successful (2xx) but your custom status isn't 'success'
      const apiMessage = response.data?.message || "Registration failed with an unexpected server response.";
      error.value = apiMessage;
      toast.error(apiMessage);
    }

  } catch (axiosError: any) { // Catching errors from the axios request
    console.error('Registration Axios Error:', axiosError);
    let errorMessage = "Failed to register pet. Please try again.";

    if (axiosError.response) {
      // The request was made and the server responded with a status code
      // that falls out of the range of 2xx (e.g., 422, 500)
      if (axiosError.response.data) {
        if (axiosError.response.data.errors) {
          // Laravel validation errors (typically from a 422 response)
          errorMessage = Object.values(axiosError.response.data.errors).flat().join(' ');
        } else if (axiosError.response.data.message) {
          // Custom error message from your API
          errorMessage = axiosError.response.data.message;
        } else {
          errorMessage = `Error ${axiosError.response.status}: An unexpected server error occurred.`;
        }
      } else {
        errorMessage = `Error ${axiosError.response.status}: Server error.`;
      }
    } else if (axiosError.request) {
      // The request was made but no response was received
      errorMessage = "No response from server. Please check your network connection.";
    } else {
      // Something happened in setting up the request that triggered an Error
      errorMessage = axiosError.message || "An unknown error occurred during registration.";
    }
    
    error.value = errorMessage;
    toast.error(errorMessage);
    // Decide if you want to keep the dialog open on error
    // showConfirmDialog.value = false; 
  } finally {
    isUploading.value = false;
    form.processing = false; // Reset processing state
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
            <!-- The <Form> component from shadcn-vue typically works with vee-validate under the hood.
                 If you're not using its built-in submission handling (which you aren't when using axios directly),
                 its primary role here becomes structural and for styling.
                 The @submit.prevent="handleSubmit" still correctly calls your handleSubmit function. -->
            <Form @submit.prevent="handleSubmit">
              <!-- Image Upload Section -->
              <div class="mb-8">
                <div class="flex flex-col items-center">
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
                        <span class="text-sm text-muted-foreground font-medium">Add Pet Photo</span>
                      </div>
                    </div>
                    <Label 
                      for="pet-image" 
                      class="absolute bottom-0 right-0 p-3 rounded-full bg-primary text-white shadow cursor-pointer"
                    >
                      <Icon name="Plus" class="h-5 w-5" />
                    </Label>
                    <input 
                      type="file" 
                      id="pet-image"
                      accept="image/jpeg, image/png, image/gif" 
                      class="hidden" 
                      @change="handleImageSelect" 
                      :disabled="isSubmitting"
                    />
                  </div>
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
                       <!-- Manual error display if not relying on form.errors from useForm -->
                       <!-- <FormMessage v-if="!meta.valid && meta.touched && error.includes('pet name')" /> -->
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
                      <FormLabel>Breed </FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="Enter breed (if known)" 
                          v-model="form.breed" 
                          :disabled="isSubmitting"
                         
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
          <div class="flex justify-center mt-2">
            <div class="w-24 h-24 rounded-full overflow-hidden border border-muted">
              <img 
                v-if="imagePreview" 
                :src="imagePreview" 
                alt="Pet preview" 
                class="w-full h-full object-cover" 
              />
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