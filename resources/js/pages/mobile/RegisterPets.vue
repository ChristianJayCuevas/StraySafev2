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
  pictures: [] as File[], // This will hold the actual File objects
});

// UI state
const isUploading = ref(false);
const error = ref('');
const showConfirmDialog = ref(false);
const imagePreviews = ref<string[]>([]);

const removeImage = (index: number) => {
  // Remove from both the form data and the previews
  form.pictures.splice(index, 1);
  imagePreviews.value.splice(index, 1);
};


const isFormValid = computed(() => {
  return form.pet_name && 
         form.animal_type && 
         form.breed && 
         form.contact && 
         form.pictures.length > 0; // Check if at least one picture exists
});

const isSubmitting = computed(() => {
  return isUploading.value;
});

// Helper function to handle image selection
const handleImageSelect = (event: Event) => {
  const input = event.target as HTMLInputElement;
  if (!input.files || input.files.length === 0) return;

  const files = Array.from(input.files);

  for (const file of files) {
    if (form.pictures.length >= 3) {
        toast.warning("You can only upload a maximum of 3 photos.");
        break; // Stop processing more files
    }
    
    const maxSizeInBytes = 2 * 1024 * 1024;
    if (file.size > maxSizeInBytes) {
      toast.error(`Image "${file.name}" is too large. Maximum size is 2MB.`);
      continue;
    }
    form.pictures.push(file);
    imagePreviews.value.push(URL.createObjectURL(file));
  }
  input.value = '';
};


const handleSubmit = () => {
  if (!isFormValid.value) {
    error.value = 'Please fill in all required fields and upload at least one pet photo.';
    toast.warning(error.value);
    return;
  }
  showConfirmDialog.value = true;
};

// IMPORTANT: This now uses Inertia's form helper, not axios.
const confirmSubmit = () => {
  showConfirmDialog.value = false;
  // Inertia's form helper automatically sets the correct `Content-Type` (multipart/form-data)
  // because `form.pictures` contains File objects.
  form.post(route('mobileregisteredanimals.post'), { // Assumes you named your route
    // If not using named routes, use the URL: '/api/mobileregisteredanimals'
    preserveScroll: true,
    onSuccess: (page) => {
      toast.success("Your pet has been registered successfully.");
      form.reset();
      imagePreviews.value = [];
    },
    onError: (errors) => {
      // `errors` is an object with validation messages from Laravel
      const firstError = Object.values(errors)[0];
      toast.error(firstError || 'An unknown error occurred.');
    },
    onFinish: () => {
      // This runs regardless of success or error
      // `form.processing` is automatically handled
    },
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
            <form @submit.prevent="handleSubmit">
              <div class="mb-8">
                <Label class="text-lg font-semibold mb-2 block text-center">Pet Photos</Label>
                <div class="flex flex-wrap justify-center items-end gap-4">
                  <div v-for="(preview, index) in imagePreviews" :key="index" class="relative group w-32 h-32">
                    <img :src="preview" alt="Pet preview" class="w-full h-full object-cover rounded-lg border-2 border-muted shadow-md" />
                    <button 
                      type="button" 
                      @click="removeImage(index)"
                      class="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 leading-none shadow-lg hover:bg-red-600"
                      :disabled="form.processing"
                    >
                      <Icon name="X" class="h-4 w-4" />
                    </button>
                    <div v-if="index === 0" class="absolute bottom-0 w-full bg-primary text-white text-xs text-center py-0.5 rounded-b-md">Main</div>
                  </div>

                  <!-- The 'Add Photo' button -->
                  <div v-if="imagePreviews.length < 3">
                    <Label 
                      for="pet-image-upload"
                      class="w-32 h-32 flex flex-col items-center justify-center border-2 border-dashed rounded-lg cursor-pointer hover:bg-muted"
                      :class="{ 'opacity-50 cursor-not-allowed': form.processing }"
                    >
                      <Icon name="PlusCircle" class="h-8 w-8 text-muted-foreground" />
                      <span class="text-sm text-muted-foreground mt-1">Add Photo</span>
                      <span class="text-xs text-muted-foreground">({{ imagePreviews.length }}/3)</span>
                    </Label>
                    <input 
                      type="file" 
                      id="pet-image-upload"
                      accept="image/jpeg, image/png, image/gif" 
                      class="hidden" 
                      multiple
                      @change="handleImageSelect" 
                      :disabled="form.processing"
                    />
                  </div>
                </div>
                 <p class="text-sm text-muted-foreground text-center mt-4">
                    The first photo will be the main profile picture. You can add up to 3 photos.
                  </p>
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