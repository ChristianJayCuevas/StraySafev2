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
  picture: null as string | null, // Now 'picture' will hold the Base64 string
});

// UI state
const isUploading = ref(false);
const error = ref('');
const showConfirmDialog = ref(false);
const imagePreview = ref(''); // This will hold the Data URI for preview (e.g., data:image/jpeg;base64,...)

// Computed values
const isFormValid = computed(() => {
  return form.pet_name && 
         form.animal_type && 
         form.breed && 
         form.contact && 
         form.picture; // Check if Base64 picture string exists
});

const isSubmitting = computed(() => {
  return form.processing || isUploading.value;
});

const handleImageSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;
  
  const file = input.files[0];
  
  // Max file size (e.g., 2MB) - important for Base64 to avoid huge strings
  const maxSizeInBytes = 2 * 1024 * 1024; 
  if (file.size > maxSizeInBytes) {
    error.value = 'Image is too large. Maximum size is 2MB.';
    toast.error(error.value);
    imagePreview.value = '';
    form.picture = null;
    if (input) input.value = ''; // Reset file input
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    const result = e.target?.result as string;
    imagePreview.value = result; // This is the Data URI (e.g., "data:image/jpeg;base64,iVBOR...")

    // Store only the Base64 part in the form.
    // The backend will expect just the encoded string, not the "data:mime/type;base64," prefix.
    // If your backend expects the full Data URI, you can assign `result` directly.
    // For this example, let's assume backend wants only the Base64 part.
    if (result.includes(',')) {
        form.picture = result.split(',')[1];
    } else {
        form.picture = result; // Should not happen if reader.readAsDataURL is used correctly
    }
  };
  reader.onerror = (err) => {
    console.error("FileReader error: ", err);
    error.value = "Could not read the image file.";
    toast.error(error.value);
    form.picture = null;
    imagePreview.value = '';
  }
  reader.readAsDataURL(file); // Reads the file as a Base64 encoded string (Data URI)
  
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

const confirmSubmit = () => {
  isUploading.value = true;
  error.value = '';
  
  // 'form.picture' now contains the Base64 string
  form.post('/api/mobileregisteredanimals', { // Assuming this API endpoint matches your Laravel route
    onSuccess: () => {
      toast.success("Your pet has been registered successfully.");
      form.reset();
      imagePreview.value = '';
      showConfirmDialog.value = false;
    },
    onError: (errors) => {
      console.error('Registration Error:', errors);
      const errorMessages = Object.values(errors).flat().join(', ');
      error.value = errorMessages || 'Failed to register pet. Please try again.';
      toast.error(error.value || "Registration failed");
      showConfirmDialog.value = false;
    },
    onFinish: () => {
      isUploading.value = false;
    }
  });
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
                  <div class="relative mb-4 group">
                    <div 
                      class="w-48 h-48 rounded-full flex items-center justify-center overflow-hidden border-4 border-primary shadow-lg hover:opacity-90 transition-opacity"
                      :class="{ 'bg-muted': !imagePreview }"
                    >
                      <!-- imagePreview will be the full Data URI: data:image/jpeg;base64,... -->
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
                  <FormField name="pet_name" v-slot="{ componentField }">
                    <FormItem>
                      <FormLabel>Pet Name <span class="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="Enter your pet's name" 
                          v-bind="componentField"
                          v-model="form.pet_name" 
                          :disabled="isSubmitting"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  
                   <FormField name="animal_type" v-slot="{ componentField }">
                    <FormItem>
                      <FormLabel>Pet Type <span class="text-red-500">*</span></FormLabel>
                      <Select v-model="form.animal_type" :disabled="isSubmitting" v-bind="componentField">
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
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  
                  <FormField name="breed" v-slot="{ componentField }">
                    <FormItem>
                      <FormLabel>Breed <span class="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="text"
                          placeholder="Enter breed (if known)" 
                          v-bind="componentField"
                          v-model="form.breed" 
                          :disabled="isSubmitting"
                          required
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  </FormField>
                  
                  <FormField name="contact" v-slot="{ componentField }">
                    <FormItem>
                      <FormLabel>Contact Number <span class="text-red-500">*</span></FormLabel>
                      <FormControl>
                        <Input 
                          type="tel"
                          placeholder="Your contact number" 
                          v-bind="componentField"
                          v-model="form.contact" 
                          :disabled="isSubmitting"
                          required
                        />
                      </FormControl>
                      <FormDescription>
                        This will be displayed on your pet's profile for contact purposes
                      </FormDescription>
                      <FormMessage />
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
          <!-- ... (display other form fields: name, type, breed, contact) ... -->
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
              <!-- imagePreview is the Data URI, perfect for src -->
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
/* Your existing styles (if any) */
.text-red { /* If you were using a custom class, ensure it's defined or use Tailwind's text-red-500 etc. */
  color: #ef4444; /* Example: text-red-500 */
}
</style>