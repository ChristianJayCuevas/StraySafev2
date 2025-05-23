<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref, onMounted, computed } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
import axios from 'axios';
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardContent,
  CardFooter 
} from '@/components/ui/card';
import CardData from '@/components/CardData.vue';
import Icon from '@/components/Icon.vue';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { toast } from 'vue-sonner';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'Stray Monitor',
    href: '/cctv',
  },
];

// Type definitions
interface CCTVCamera {
  id: number;
  name: string;
  location: string;
  streamUrl: string;
  status: 'live' | 'demo' | 'offline';
  lastUpdated: string;
  mode: 'highquality' | 'lowquality';
}

// State variables
const isLoading = ref(true);
const cameras = ref<CCTVCamera[]>([]);
const gridLayout = ref('grid-cols-2');
const searchQuery = ref('');

// Column layout options
const columnOptions = [
  { value: 'grid-cols-1', label: '1 Column' },
  { value: 'grid-cols-2', label: '2 Columns' },
  { value: 'grid-cols-3', label: '3 Columns' },
  { value: 'grid-cols-4', label: '4 Columns' },
];

// Form state for adding camera
const showAddDialog = ref(false);
const newCamera = ref<Partial<CCTVCamera & { sourceType?: string; videoFile?: File }>>({ // Added sourceType and videoFile for form
  name: '',
  location: '',
  streamUrl: '',
  status: 'demo',
  mode: 'highquality',
  sourceType: 'stream', // Default to stream
});

// NEW: State for stream control
const showStreamControlDialog = ref(false);
const streamNameToControl = ref('');
const isStreamActionLoading = ref(false);
const currentActionInProgress = ref<'start' | 'stop' | null>(null);


// Dashboard stats
const totalCameras = computed(() => cameras.value.length);
const onlineCameras = computed(() => cameras.value.filter(cam => cam.status !== 'offline').length);
const offlineCameras = computed(() => cameras.value.filter(cam => cam.status === 'offline').length);
const liveCameras = computed(() => cameras.value.filter(cam => cam.status === 'live').length);
// Removed aiCameras and directCameras as they seem to be duplicates of mode filtering if needed later

// Filter cameras based on search query
const filteredCameras = computed(() => {
  if (!searchQuery.value) return cameras.value;
  
  const query = searchQuery.value.toLowerCase();
  return cameras.value.filter(camera => 
    camera.name.toLowerCase().includes(query) || 
    camera.location.toLowerCase().includes(query) || 
    camera.status.toLowerCase().includes(query) ||
    camera.mode.toLowerCase().includes(query)
  );
});

// Generate player URL
const getPlayerUrl = (camera: CCTVCamera) => {
  if (!camera || !camera.streamUrl) return '';
  const cameraMatch = camera.streamUrl.match(/cam-(\d+)/);
  const cameraNumber = cameraMatch ? cameraMatch[1] : '1';
  let streamUrl = camera.streamUrl;
  if (camera.mode === 'lowquality') {
    streamUrl = `https://straysafe.me/hls2/cam${cameraNumber}/index.m3u8`;
  }
  const encodedUrl = encodeURIComponent(streamUrl);
  return `https://anym3u8player.com/ultimate-player-generator/player.php?player=videojs&url=${encodedUrl}&autoplay=1&muted=1&loop=1&controls=auto&theme=dark&buffer=30&quality=1&speed=1&pip=1&fullscreen=1&no_download=1&width=responsive&aspect=16%3A9`;
};

// Mock data (existing)
const dummyData: CCTVCamera[] = [
  // ... (dummy data remains the same)
];

// API Interaction functions (existing and modified)
const transformCameraData = (apiCamera: any) => {
  return {
    id: apiCamera.id,
    name: apiCamera.name,
    location: apiCamera.location,
    streamUrl: apiCamera.stream_url,
    status: apiCamera.status,
    mode: apiCamera.mode,
    lastUpdated: apiCamera.last_updated || new Date(apiCamera.updated_at).toLocaleString()
  };
};

const fetchCameras = async () => {
  isLoading.value = true;
  try {
    const response = await axios.get('/cameras');
    cameras.value = response.data.map(transformCameraData);
  } catch (error) {
    console.error('Failed to fetch cameras:', error);
    toast.error('Failed to load cameras');
    if (import.meta.env.DEV) {
      cameras.value = dummyData;
    }
  } finally {
    isLoading.value = false;
  }
};

const addCamera = async () => {
  // Basic validation
  if (!newCamera.value.name || !newCamera.value.location) {
    toast.error('Name and Location are required.');
    return;
  }
  if (newCamera.value.sourceType === 'stream' && !newCamera.value.streamUrl) {
    toast.error('Stream URL is required for stream source type.');
    return;
  }
  // Add validation for file upload if needed

  try {
    const cameraData = {
      name: newCamera.value.name,
      location: newCamera.value.location,
      stream_url: newCamera.value.streamUrl, // This will be empty if sourceType is 'upload' unless handled
      status: newCamera.value.status,
      mode: newCamera.value.mode,
      // Potentially include sourceType or file data if backend supports it
    };
    
    const response = await axios.post('/cameras', cameraData);
    
    if (response.data.camera) {
      cameras.value.push(transformCameraData(response.data.camera));
    }
    
    toast.success('Camera added successfully');
    showAddDialog.value = false;
    newCamera.value = {
      name: '',
      location: '',
      streamUrl: '',
      status: 'demo',
      mode: 'highquality',
      sourceType: 'stream',
    };
  } catch (error: any) {
    console.error('Failed to add camera:', error);
    toast.error(error.response?.data?.message || 'Failed to add camera');
  }
};

// NEW: Stream Control Functions
const controlStream = async (action: 'start' | 'stop') => {
  if (!streamNameToControl.value.trim()) {
    toast.error('Please enter a stream identifier.');
    return;
  }

  isStreamActionLoading.value = true;
  currentActionInProgress.value = action;
  try {
    const streamId = streamNameToControl.value.trim();
    // IMPORTANT: The URL is absolute (http://straysafe.me). 
    // If your Vue app is on a different domain, straysafe.me must have CORS configured
    // to allow requests from your app's origin. Alternatively, use a backend proxy.
    const url = `http://straysafe.me/streamcontrol/stream/${streamId}/${action}`;
    
    await axios.post(url); // These POST requests typically don't need a data payload

    toast.success(`Stream '${streamId}' ${action} command sent successfully.`);
    // Optionally, clear input or close dialog:
    // streamNameToControl.value = '';
    // showStreamControlDialog.value = false; 
  } catch (error: any) {
    console.error(`Failed to ${action} stream '${streamNameToControl.value.trim()}':`, error);
    const backendMessage = error.response?.data?.message || error.response?.data?.error;
    const errorMessage = backendMessage || `Failed to ${action} stream. Please check the console for more details.`;
    toast.error(errorMessage);
  } finally {
    isStreamActionLoading.value = false;
    currentActionInProgress.value = null;
  }
};

const handleStreamStart = () => {
  controlStream('start');
};

const handleStreamStop = () => {
  controlStream('stop');
};


// ... (removeCamera, toggleCameraStatus, toggleCameraMode functions remain the same)
const removeCamera = async (id: number) => {
  try {
    await axios.delete(`/cameras/${id}`);
    cameras.value = cameras.value.filter(camera => camera.id !== id);
    toast.success('Camera removed successfully');
  } catch (error: any) {
    console.error('Failed to remove camera:', error);
    toast.error(error.response?.data?.message || 'Failed to remove camera');
  }
};

const toggleCameraStatus = async (camera: CCTVCamera) => {
  const statusMap = { 'live': 'demo', 'demo': 'offline', 'offline': 'live' } as const;
  const newStatus = statusMap[camera.status];
  try {
    await axios.patch(`/cameras/${camera.id}/status`, { status: newStatus });
    camera.status = newStatus;
    camera.lastUpdated = new Date().toLocaleString(); // Corrected property name
    toast(`Camera ${camera.name} is now ${camera.status}`, {
      icon: camera.status === 'live' ? '🟢' : camera.status === 'demo' ? '🟡' : '🔴'
    });
  } catch (error: any) {
    console.error('Failed to update camera status:', error);
    toast.error(error.response?.data?.message || 'Failed to update camera status');
  }
};

const toggleCameraMode = async (camera: CCTVCamera) => {
  const newMode = camera.mode === 'highquality' ? 'lowquality' : 'highquality';
  try {
    await axios.patch(`/cameras/${camera.id}/mode`, { mode: newMode });
    camera.mode = newMode;
    camera.lastUpdated = new Date().toLocaleString(); // Corrected property name
    toast.success(`Camera ${camera.name} mode changed to ${camera.mode === 'highquality' ? 'High Quality' : 'Low Quality'}`);
  } catch (error: any) {
    console.error('Failed to update camera mode:', error);
    toast.error(error.response?.data?.message || 'Failed to update camera mode');
  }
};


// Lifecycle hooks
onMounted(() => {
  fetchCameras();
});

// Helper functions for UI (existing)
const getStatusColor = (status: string) => { /* ... */ return status === 'live' ? 'bg-green-500' : status === 'demo' ? 'bg-yellow-500' : 'bg-red-500'; };
const getStatusBadgeVariant = (status: string) => { /* ... */ return status === 'live' ? 'success' : status === 'demo' ? 'warning' : 'destructive'; };
const getModeBadgeVariant = (mode: string) => { /* ... */ return mode === 'highquality' ? 'secondary' : 'primary'; };
const clearSearch = () => { searchQuery.value = ''; };

// Placeholder for functions mentioned in template but not fully defined
const handleSourceTypeChange = (value: string) => {
  if (newCamera.value) {
    newCamera.value.sourceType = value;
    if (value === 'upload') newCamera.value.streamUrl = ''; // Clear streamUrl if switching to upload
    // else newCamera.value.videoFile = undefined; // Clear videoFile if switching to stream
  }
};
const handleFileUpload = (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0] && newCamera.value) {
    newCamera.value.videoFile = target.files[0];
    // Potentially set streamUrl to represent the file or handle it on backend
  }
};

</script>

<template>
  <Head title="CCTV Management" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-6 bg-background">
      <!-- Stats Cards -->
      <div class="grid auto-rows-min gap-4 md:grid-cols-4">
        <!-- ... existing stats cards ... -->
         <template v-if="isLoading">
          <Skeleton class="h-[180px] w-full rounded-xl" v-for="i in 4" :key="'stat-skeleton-' + i" />
        </template>
        <template v-else>
          <CardData title="Total Cameras" :value="totalCameras" icon="video" description="All registered cameras" />
          <CardData title="Online Cameras" :value="onlineCameras" icon="wifi" description="Currently accessible cameras" />
          <CardData title="Offline Cameras" :value="offlineCameras" icon="wifiOff" description="Currently inaccessible cameras" />
          <CardData title="Live Feeds" :value="liveCameras" icon="radioTower" description="Real-time streaming cameras" />
        </template>
      </div>

      <!-- Controls and Search Bar -->
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <!-- Search Bar -->
        <div class="relative w-full md:w-64">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Icon name="search" class="h-4 w-4 text-muted-foreground" />
          </div>
          <Input 
            v-model="searchQuery" 
            placeholder="Search cameras..." 
            class="pl-10 pr-10"
          />
          <button 
            v-if="searchQuery" 
            @click="clearSearch" 
            class="absolute inset-y-0 right-0 flex items-center pr-3"
          >
            <Icon name="x" class="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>
        
        <!-- Column Layout Control & Action Buttons -->
        <div class="flex space-x-2 md:space-x-4 items-center">
          <div class="flex items-center space-x-2">
            <Label for="grid-layout" class="sr-only">Grid Layout</Label>
            <Select v-model="gridLayout">
              <SelectTrigger id="grid-layout" class="w-[130px] md:w-40">
                <SelectValue placeholder="Columns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in columnOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <!-- NEW: Stream Control Dialog & Trigger -->
          <Dialog v-model:open="showStreamControlDialog">
            <DialogTrigger asChild>
              <Button variant="outline" @click="showStreamControlDialog = true">
                <Icon name="settings-2" class="mr-2 h-4 w-4" />
                Stream Control
              </Button>
            </DialogTrigger>
            <DialogContent class="sm:max-w-[480px]">
              <DialogHeader>
                <DialogTitle>Control Stream</DialogTitle>
                <DialogDescription>
                  Enter the stream identifier (e.g., mylive_loop) to start or stop its broadcast.
                </DialogDescription>
              </DialogHeader>
              
              <div class="grid gap-4 py-4">
                <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="streamName" class="text-right col-span-1">Stream ID</Label>
                  <Input 
                    id="streamName" 
                    v-model="streamNameToControl" 
                    class="col-span-3" 
                    placeholder="e.g., mylive_loop"
                    @keyup.enter="if (streamNameToControl.trim() && !isStreamActionLoading) handleStreamStart()"
                  />
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" @click="showStreamControlDialog = false" :disabled="isStreamActionLoading">Cancel</Button>
                <div class="flex space-x-2">
                  <Button 
                    @click="handleStreamStart" 
                    :disabled="isStreamActionLoading || !streamNameToControl.trim()"
                    class="bg-green-500 hover:bg-green-600 text-white"
                  >
                    <Icon v-if="currentActionInProgress === 'start' && isStreamActionLoading" name="loader-2" class="mr-2 h-4 w-4 animate-spin" />
                    <Icon v-else name="play" class="mr-2 h-4 w-4" />
                    Start
                  </Button>
                  <Button 
                    @click="handleStreamStop" 
                    :disabled="isStreamActionLoading || !streamNameToControl.trim()"
                    variant="destructive"
                  >
                    <Icon v-if="currentActionInProgress === 'stop' && isStreamActionLoading" name="loader-2" class="mr-2 h-4 w-4 animate-spin" />
                    <Icon v-else name="stop-circle" class="mr-2 h-4 w-4" />
                    Stop
                  </Button>
                </div>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <!-- Existing Add Camera Dialog & Trigger -->
          <Dialog v-model:open="showAddDialog">
            <DialogTrigger asChild>
              <Button variant="default" @click="showAddDialog = true">
                <Icon name="plus" class="mr-2 h-4 w-4" />
                Add Camera
              </Button>
            </DialogTrigger>
            <DialogContent class="sm:max-w-[525px]"> <!-- Adjusted width slightly for more content -->
              <DialogHeader>
                <DialogTitle>Add New Camera</DialogTitle>
                <DialogDescription>
                  Add a new CCTV camera to your monitoring system.
                </DialogDescription>
              </DialogHeader>
              
              <div class="grid gap-4 py-4">
                <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="name" class="text-right">Name</Label>
                  <Input id="name" v-model="newCamera.name" class="col-span-3" placeholder="Main Entrance" />
                </div>
                <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="location" class="text-right">Location</Label>
                  <Input id="location" v-model="newCamera.location" class="col-span-3" placeholder="Front Gate" />
                </div>
                <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="sourceType" class="text-right">Source Type</Label>
                  <Select v-model="newCamera.sourceType" @update:modelValue="handleSourceTypeChange">
                    <SelectTrigger class="col-span-3">
                      <SelectValue placeholder="Select source type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stream">Stream URL</SelectItem>
                      <SelectItem value="upload">Upload Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div v-if="newCamera.sourceType === 'stream'" class="grid grid-cols-4 items-center gap-4">
                  <Label for="streamUrl" class="text-right">Stream URL</Label>
                  <Input id="streamUrl" v-model="newCamera.streamUrl" class="col-span-3" placeholder="https://example.com/stream.m3u8" />
                </div>
                
                <div v-if="newCamera.sourceType === 'upload'" class="grid grid-cols-4 items-center gap-4">
                  <Label for="videoUpload" class="text-right">Upload Video</Label>
                  <div class="col-span-3">
                    <Input 
                      id="videoUpload" 
                      type="file" 
                      accept="video/*" 
                      @change="handleFileUpload"
                    />
                    <p v-if="newCamera.videoFile" class="text-sm text-muted-foreground mt-1">
                      Selected: {{ newCamera.videoFile.name }}
                    </p>
                  </div>
                </div>
                
                <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="status" class="text-right">Status</Label>
                  <Select v-model="newCamera.status">
                    <SelectTrigger class="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="live">Live</SelectItem>
                      <SelectItem value="demo">Demo</SelectItem>
                      <SelectItem value="offline">Offline</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="mode" class="text-right">Camera Mode</Label>
                  <Select v-model="newCamera.mode">
                    <SelectTrigger class="col-span-3">
                      <SelectValue placeholder="Select mode" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="highquality">High Quality CCTV</SelectItem>
                      <SelectItem value="lowquality">Low Quality CCTV</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <DialogFooter>
                <Button variant="outline" @click="showAddDialog = false">Cancel</Button>
                <Button @click="addCamera">Add Camera</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <!-- Results Counter -->
      <div v-if="!isLoading" class="text-sm text-muted-foreground">
        Showing {{ filteredCameras.length }} of {{ cameras.length }} cameras
        <span v-if="searchQuery">(filtered by "{{ searchQuery }}")</span>
      </div>

      <!-- Camera Grid -->
      <div v-if="isLoading" class="grid gap-4" :class="gridLayout">
        <Skeleton class="h-[300px] w-full rounded-xl" v-for="i in 4" :key="'grid-skeleton-' + i" />
      </div>
      
      <div v-else-if="filteredCameras.length === 0" class="flex items-center justify-center h-64 bg-background/50 rounded-lg border border-dashed">
        <!-- ... existing no cameras found message ... -->
         <div class="text-center p-8">
          <Icon name="video-off" class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 class="text-lg font-medium">No Cameras Found</h3>
          <p class="text-muted-foreground mb-4">
            <span v-if="searchQuery">No results match your search criteria. Try adjusting your search.</span>
            <span v-else>Add your first camera to start monitoring.</span>
          </p>
          <div class="flex gap-2 justify-center">
            <Button v-if="searchQuery" variant="outline" @click="clearSearch">
              <Icon name="x" class="mr-2 h-4 w-4" />
              Clear Search
            </Button>
            <Button @click="showAddDialog = true">
              <Icon name="plus" class="mr-2 h-4 w-4" />
              Add Camera
            </Button>
          </div>
        </div>
      </div>
      
      <div v-else class="grid gap-4" :class="gridLayout">
        <Card 
          v-for="camera in filteredCameras" 
          :key="camera.id"
          class="overflow-hidden hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 hover:-translate-y-1 transition-all duration-300"
        >
          <CardHeader class="p-3 space-y-0">
            <div class="flex items-center justify-between">
              <CardTitle class="text-lg flex items-center">
                <div class="mr-2">
                  <div :class="['h-2 w-2 rounded-full animate-pulse inline-block mr-1', getStatusColor(camera.status)]"></div>
                </div>
                {{ camera.name }}
              </CardTitle>
              <div class="flex items-center space-x-2">
                <Badge :variant="getStatusBadgeVariant(camera.status)">
                  {{ camera.status.toUpperCase() }}
                </Badge>
                <Badge :variant="getModeBadgeVariant(camera.mode)">
                  {{ camera.mode === 'highquality' ? 'HIGH QUALITY' : 'LOW QUALITY' }}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild> <!-- Added asChild for proper trigger behavior -->
                    <Button variant="ghost" size="icon" class="h-8 w-8">
                      <Icon name="moreVertical" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="toggleCameraStatus(camera)">
                      <Icon name="refresh" class="mr-2 h-4 w-4" />
                      Change Status
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="toggleCameraMode(camera)">
                      <Icon name="switch" class="mr-2 h-4 w-4" />
                      Toggle Mode ({{ camera.mode === 'highquality' ? 'Low' : 'High' }} Quality)
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="removeCamera(camera.id)" class="text-destructive focus:text-destructive focus:bg-destructive/10">
                      <Icon name="trash" class="mr-2 h-4 w-4" />
                      Remove Camera
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardHeader>
          
          <CardContent class="p-0">
            <div v-if="camera.status === 'offline'" class="h-56 bg-muted flex items-center justify-center">
              <!-- ... existing offline state ... -->
                <div class="text-center p-4">
                <Icon name="wifiOff" class="h-12 w-12 mx-auto mb-2 text-muted-foreground" />
                <p class="text-muted-foreground">Camera offline</p>
                <Button variant="outline" size="sm" class="mt-2" @click="toggleCameraStatus(camera)">
                  <Icon name="refreshCw" class="mr-2 h-3 w-3" />
                  Reconnect
                </Button>
              </div>
            </div>
            <div v-else class="relative aspect-video bg-black">
              <!-- ... existing player iframe ... -->
               <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width:100%;">
                <iframe 
                  style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                  webkitAllowFullScreen mozallowfullscreen allowfullscreen 
                  width="640" height="360" frameborder="0" allow="autoplay"
                  :src="getPlayerUrl(camera)"
                ></iframe>
              </div>
              <div class="absolute top-2 right-2">
                 <!-- ... existing status/mode badges on player ... -->
                 <div class="flex space-x-2">
                  <div class="flex items-center space-x-1 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                    <div :class="['h-2 w-2 rounded-full animate-pulse', getStatusColor(camera.status)]"></div>
                    <span>{{ camera.status === 'live' ? 'LIVE' : 'DEMO' }}</span>
                  </div>
                  <div class="flex items-center space-x-1 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                    <Icon :name="camera.mode === 'highquality' ? 'brain' : 'eye'" class="h-3 w-3 mr-1" />
                    <span>{{ camera.mode === 'highquality' ? 'High Quality' : 'Low Quality' }}</span>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter class="p-3 pt-2 flex flex-col items-start space-y-1">
            <div class="flex justify-between items-center w-full">
              <span class="flex items-center text-sm">
                <Icon name="mapPin" class="h-3 w-3 mr-1 text-muted-foreground" />
                {{ camera.location }}
              </span>
            </div>
            <!-- <span class="text-xs text-muted-foreground">Updated: {{ camera.lastUpdated }}</span> -->
          </CardFooter>
        </Card>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>