<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head, useForm } from '@inertiajs/vue3';
import { ref, computed, onMounted } from 'vue';
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
  DialogTrigger, 
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

// Form state
const form = useForm({
  pet_name: '',
  animal_type: '',
  breed: '',
  contact: '',
  picture: null as File | null,
  picture_url: '' as string | null,
});

// UI state
const isUploading = ref(false);
const isProcessing = ref(false);
const detectionResult = ref(null);
const error = ref('');
const showConfirmDialog = ref(false);
const imagePreview = ref('');

// Computed values
const isFormValid = computed(() => {
  return form.pet_name && 
         form.animal_type && 
         form.breed && 
         form.contact && 
         (form.picture || form.picture_url);
});

const isSubmitting = computed(() => {
  return form.processing || isUploading.value || isProcessing.value;
});

const uploadPercentage = ref(0);

const handleImageSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  
  // Preview the image
  const reader = new FileReader();
  reader.onload = (e) => {
    imagePreview.value = e.target?.result as string;
  };
  reader.readAsDataURL(file);
  
  form.picture = file;
  form.picture_url = null;
  
  // Analyze the image
  await analyzeImage(file);
};

const analyzeImage = async (file: File) => {
  isProcessing.value = true;
  error.value = '';
  detectionResult.value = null;
  uploadPercentage.value = 0;
  
  try {
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post('/api/pets/analyze-image', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total) {
          uploadPercentage.value = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
        }
      },
    });
    
    if (response.data.status === 'success') {
      detectionResult.value = response.data;
      form.animal_type = response.data.label;
      form.picture_url = response.data.file_url;
      toast.success(
        `We detected a ${response.data.label} in your image.`,
      );
    } else if (response.data.status === 'rejected') {
      error.value = response.data.message || 'Please upload a clearer image.';
      toast.warning(
        error.value,

      );
      imagePreview.value = '';
      form.picture = null;
    } else {
      error.value = response.data.message || 'Failed to classify the image.';
      toast.warning(
        error.value
      );
    }
  } catch (err) {
    console.error('Image Upload Error:', err);
    error.value = 'Failed to connect to classification service.';
    toast.warning(
    "Connection error"
    );
    imagePreview.value = '';
    form.picture = null;
  } finally {
    isProcessing.value = false;
  }
};

const handleSubmit = () => {
  if (!isFormValid.value) {
    error.value = 'Please fill in all required fields and upload a verified pet photo.';
    toast.warning(

       error.value
     
    );
    return;
  }
  
  showConfirmDialog.value = true;
};

const confirmSubmit = () => {
  isUploading.value = true;
  error.value = '';
  
  // Use the URL from detection API instead of uploading again
  form.post('/api/pets/register', {
    onSuccess: () => {
      toast.success(
       "Your pet has been registered successfully."
      );
      form.reset();
      imagePreview.value = '';
      detectionResult.value = null;
      showConfirmDialog.value = false;
    },
    onError: (errors) => {
      console.error('Registration Error:', errors);
      error.value = Object.values(errors).join(', ') || 'Failed to register pet. Please try again.';
      toast.warning(
 "Registration failed"

        
      );
      showConfirmDialog.value = false;
    },
    onFinish: () => {
      isUploading.value = false;
    }
  });
};

// Define the available pet types
const petTypes = [
  { value: 'Dog', label: 'Dog' },
  { value: 'Cat', label: 'Cat' },
];
</script>

<template>
  <Head title="Register Pet" />
  <AppLayout :breadcrumbs="breadcrumbs">
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
                      accept="image/*" 
                      class="hidden" 
                      @change="handleImageSelect" 
                      :disabled="isSubmitting"
                    />
                  </div>
                  
                  <!-- Progress & Detection Results -->
                  <div v-if="isProcessing" class="w-full max-w-xs mb-4">
                    <Label class="text-sm mb-1 block text-center">Analyzing image...</Label>
                    <div class="w-full bg-muted rounded-full h-2 mb-2">
                      <div 
                        class="bg-primary h-2 rounded-full" 
                        :style="{ width: `${uploadPercentage}%` }"
                      ></div>
                    </div>
                  </div>
                  
                  <div v-if="detectionResult" class="w-full max-w-md text-center">
                    <Alert class="bg-green-50 border-green-200 text-green-800">
                      <Icon name="Check" class="h-4 w-4" />
                      <AlertTitle>Pet Detected</AlertTitle>
                      <AlertDescription>
                        Detected: {{ detectionResult.label }} 
                        (Confidence: <span class="font-bold">{{ (detectionResult.confidence * 100).toFixed(2) }}%</span>)
                      </AlertDescription>
                    </Alert>
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
                  <FormField name="pet_name">
                    <FormItem>
                      <FormLabel>Pet Name <span class="text-red">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          id="pet-name" 
                          v-model="form.pet_name" 
                          placeholder="Enter your pet's name" 
                          :disabled="isSubmitting"
                          required
                        />
                      </FormControl>
                      <FormMessage v-if="form.errors.pet_name">{{ form.errors.pet_name }}</FormMessage>
                    </FormItem>
                  </FormField>
                  
                  <FormField name="pet_type">
                    <FormItem>
                      <FormLabel>Pet Type <span class="text-red">*</span></FormLabel>
                      <Select v-model="form.animal_type" :disabled="isSubmitting">
                        <FormControl>
                          <SelectTrigger>
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
                  
                  <FormField name="pet_breed">
                    <FormItem>
                      <FormLabel>Breed <span class="text-red">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          id="pet-breed" 
                          v-model="form.breed" 
                          placeholder="Enter breed (if known)" 
                          :disabled="isSubmitting"
                          required
                        />
                      </FormControl>
                      <FormMessage v-if="form.errors.breed">{{ form.errors.breed }}</FormMessage>
                    </FormItem>
                  </FormField>
                  
                  <FormField name="contact">
                    <FormItem>
                      <FormLabel>Contact Number <span class="text-red">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          id="contact" 
                          v-model="form.contact" 
                          placeholder="Your contact number" 
                          type="tel"
                          :disabled="isSubmitting"
                          required
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
          <Button variant="outline" @click="showConfirmDialog = false" :disabled="isUploading">
            Cancel
          </Button>
          <Button @click="confirmSubmit" :disabled="isUploading" class="gap-2">
            <Icon name="CheckCircle" class="h-4 w-4" />
            Confirm
            <span v-if="isUploading" class="ml-2">
              <Icon name="Loader2" class="h-4 w-4 animate-spin" />
            </span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </AppLayout>
</template>

<style scoped>

</style>