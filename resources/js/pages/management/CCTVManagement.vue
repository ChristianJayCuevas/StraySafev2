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
  streamUrl: string; // This might become the Python stream_name
  status: 'live' | 'demo' | 'offline'; // Status from Laravel DB
  lastUpdated: string;
  mode: 'highquality' | 'lowquality';
  // --- ADD THESE NEW PROPERTIES ---
  streamName: string;         // e.g., 'myvideo4_loop'
  isRunning: boolean;         // true if the Python stream is active
  hlsPlaylistUri: string;     // The actual HLS URL from Python
}

// State variables
const isLoading = ref(true);
const cameras = ref<CCTVCamera[]>([]);
const gridLayout = ref('grid-cols-2'); // Default 2 columns
const searchQuery = ref('');

// Column layout options
const columnOptions = [
  { value: 'grid-cols-1', label: '1 Column' },
  { value: 'grid-cols-2', label: '2 Columns' },
  { value: 'grid-cols-3', label: '3 Columns' },
  { value: 'grid-cols-4', label: '4 Columns' },
];

// Form state
const showAddDialog = ref(false);
const newCamera = ref<Partial<CCTVCamera>>({
  name: '',
  location: '',
  streamUrl: '',
  status: 'demo',
  mode: 'highquality', // Changed from 'ai' to 'highquality'
});
// Dashboard stats
const totalCameras = computed(() => cameras.value.length);
const onlineCameras = computed(() => cameras.value.filter(cam => cam.status !== 'offline').length);
const offlineCameras = computed(() => cameras.value.filter(cam => cam.status === 'offline').length);
const liveCameras = computed(() => cameras.value.filter(cam => cam.status === 'live').length);
const aiCameras = computed(() => cameras.value.filter(cam => cam.mode === 'highquality').length);
const directCameras = computed(() => cameras.value.filter(cam => cam.mode === 'lowquality').length);

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

// Generate player URL for each camera based on mode
// const getPlayerUrl = (camera: CCTVCamera) => {
//   if (!camera || !camera.streamUrl) return '';

//   // Extract camera number
//   const cameraMatch = camera.streamUrl.match(/cam-(\d+)/);
//   const cameraNumber = cameraMatch ? cameraMatch[1] : '1';

//   // Adjust URL for low quality mode
//   let streamUrl = camera.streamUrl;
//   if (camera.mode === 'lowquality') {
//     streamUrl = `https://straysafe.me/hls2/cam${cameraNumber}/index.m3u8`;
//   }

//   // Encode the stream URL to be used as a parameter
//   const encodedUrl = encodeURIComponent(streamUrl);
//   return `https://anym3u8player.com/ultimate-player-generator/player.php?player=videojs&url=${encodedUrl}&autoplay=1&muted=1&loop=1&controls=auto&theme=dark&buffer=30&quality=1&speed=1&pip=1&fullscreen=1&no_download=1&width=responsive&aspect=16%3A9`;
// };
// const getPlayerUrl = (camera: CCTVCamera) => {
//   // Use the hlsPlaylistUri if the stream is running, otherwise use the stored streamUrl as a fallback
//   const urlToPlay = camera.isRunning && camera.hlsPlaylistUri ? camera.hlsPlaylistUri : camera.streamUrl;
  
//   if (!urlToPlay) return '';

//   const encodedUrl = encodeURIComponent(urlToPlay);
//   return `https://anym3u8player.com/ultimate-player-generator/player.php?player=videojs&url=${encodedUrl}&autoplay=1&muted=1&loop=1&controls=auto&theme=dark&buffer=30&quality=1&speed=1&pip=1&fullscreen=1&no_download=1&width=responsive&aspect=16%3A9`;
// };
const STREAM_CONTROL_API_BASE = 'https://straysafe.me/streamcontrol'; // Or http://localhost:5000 for local dev
const getPlayerUrl = (camera: CCTVCamera) => {
  // The hlsPlaylistUri now contains the best available URL from the merge logic.
  const urlToPlay = camera.streamUrl;
  
  if (!urlToPlay || urlToPlay === 'N/A') return '';

  const encodedUrl = encodeURIComponent(urlToPlay);
  return `https://anym3u8player.com/ultimate-player-generator/player.php?player=videojs&url=${encodedUrl}&autoplay=1&muted=1&loop=1&controls=auto&theme=dark&buffer=30&quality=1&speed=1&pip=1&fullscreen=1&no_download=1&width=responsive&aspect=16%3A9`;
};
// Clear search query
const clearSearch = () => {
  searchQuery.value = '';
};

// Add a new camera
const transformCameraData = (apiCamera) => {
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
// In <script setup>

// This helper function extracts the stream name from a URL like 'https://straysafe.me/hls3/myvideo4_loop/playlist.m3u8'
const extractStreamNameFromUrl = (url: string): string => {
  if (!url) return '';
  const match = url.match(/\/([a-zA-Z0-9_-]+)\/playlist\.m3u8$/);
  return match ? match[1] : '';
};


const fetchCameras = async () => {
  isLoading.value = true;
  try {
    // --- Step 1: Fetch camera list from your main (Laravel) backend ---
    const camerasResponse = await axios.get('/cameras');
    
    // --- Step 2: Fetch runtime status from your Python backend ---
    const streamStatusResponse = await axios.get(`${STREAM_CONTROL_API_BASE}/stream/status`);
    const streamStatuses = streamStatusResponse.data; // The JSON object of all stream statuses

    // --- Step 3: Merge the data by extracting the stream name from the URL ---
    cameras.value = camerasResponse.data.map(dbCamera => {
      // Use our new helper function to get the stream name from the URL
      const streamName = extractStreamNameFromUrl(dbCamera.stream_url);
      
      // Look up this camera's runtime status in the object from the Python backend
      const runtimeStatus = streamStatuses[streamName];

      // Determine the final HLS URL to use for the player
      let finalHlsUrl = dbCamera.stream_url; // Default to the URL from the DB
      if (runtimeStatus && runtimeStatus.status === 'running' && runtimeStatus.hls_playlist_uri !== 'N/A') {
        // If the stream is running, use the more accurate URI from the Python backend.
        // This handles converting local file paths (file:///) to public URLs.
        const pythonUri = runtimeStatus.hls_playlist_uri;
        if (pythonUri.startsWith('file:///')) {
          // This logic is for converting local dev paths to production URLs
           finalHlsUrl = pythonUri.replace(/^file:\/\/\/[A-Z]:/, 'https://straysafe.me').replace(/\\/g, '/');
        } else {
           finalHlsUrl = pythonUri;
        }
      }

      return {
        // Data from Laravel DB
        id: dbCamera.id,
        name: dbCamera.name,
        location: dbCamera.location,
        streamUrl: dbCamera.stream_url, // Keep the original URL from the DB
        status: dbCamera.status,
        mode: dbCamera.mode,
        lastUpdated: new Date(dbCamera.updated_at).toLocaleString(),

        // Dynamically added data from Python Backend
        streamName: streamName, // The extracted name, e.g., 'myvideo4_loop'
        isRunning: runtimeStatus ? runtimeStatus.status === 'running' : false,
        hlsPlaylistUri: finalHlsUrl, // The best available URL for the player
      };
    });

  } catch (error) {
    console.error('Failed to fetch cameras or stream status:', error);
    toast.error('Failed to load real-time camera status.');
  } finally {
    isLoading.value = false;
  }
};
// Update your fetchCameras function
// const fetchCameras = async () => {
//   isLoading.value = true;
//   try {
//     const response = await axios.get('/cameras');
//     await new Promise(resolve => setTimeout(resolve, 2000));

//     // Transform each camera from the API response
//     cameras.value = response.data.map(camera => transformCameraData(camera));
//   } catch (error) {
//     console.error('Failed to fetch cameras:', error);
//     toast.error('Failed to load cameras');
//     // Fallback to dummy data only in development
//     if (import.meta.env.DEV) {
//       cameras.value = dummyData;
//     }
//   } finally {
//     isLoading.value = false;
//   }
// };

// Update your addCamera function to handle the response correctly
const addCamera = async () => {
  if (!newCamera.value.name || !newCamera.value.location || !newCamera.value.streamUrl) {
    toast.error('Please fill all required fields');
    return;
  }

  try {
    // Convert frontend property names to backend format
    const cameraData = {
      name: newCamera.value.name,
      location: newCamera.value.location,
      stream_url: newCamera.value.streamUrl,
      status: newCamera.value.status,
      mode: newCamera.value.mode,
    };

    const response = await axios.post('/cameras', cameraData);

    // Transform the response data and add to local state
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
    };
  } catch (error) {
    console.error('Failed to add camera:', error);
    toast.error(error.response?.data?.message || 'Failed to add camera');
  }
};

// Remove a camera
const removeCamera = async (id) => {
  try {
    await axios.delete(`/cameras/${id}`);

    // Filter out the camera from local state
    cameras.value = cameras.value.filter(camera => camera.id !== id);

    toast.success('Camera removed successfully');
  } catch (error) {
    console.error('Failed to remove camera:', error);
    toast.error(error.response?.data?.message || 'Failed to remove camera');
  }
};

// Toggle camera status
const toggleCameraStatus = async (camera) => {
  const statusMap = {
    'live': 'demo',
    'demo': 'offline',
    'offline': 'live'
  };

  const newStatus = statusMap[camera.status];

  try {
    await axios.patch(`/cameras/${camera.id}/status`, {
      status: newStatus
    });

    // Update local state
    camera.status = newStatus;
    camera.last_updated = new Date().toLocaleString();

    toast(`Camera ${camera.name} is now ${camera.status}`, {
      icon: camera.status === 'live' ? '🟢' : camera.status === 'demo' ? '🟡' : '🔴'
    });
  } catch (error) {
    console.error('Failed to update camera status:', error);
    toast.error(error.response?.data?.message || 'Failed to update camera status');
  }
};

const startStream = async (camera: CCTVCamera) => {
  if (!camera.streamName) {
    toast.error('Stream name is missing for this camera.');
    return;
  }
  try {
    toast.info(`Sending start command for ${camera.name}...`);
    const response = await axios.post(`${STREAM_CONTROL_API_BASE}/stream/${camera.streamName}/start`);
    toast.success(response.data.message || `Stream '${camera.name}' started.`);
    // Refresh the status to update the UI
    await fetchCameras(); 
  } catch (error) {
    console.error('Failed to start stream:', error);
    toast.error(error.response?.data?.error || `Failed to start stream for ${camera.name}.`);
  }
};

const stopStream = async (camera: CCTVCamera) => {
  if (!camera.streamName) {
    toast.error('Stream name is missing for this camera.');
    return;
  }
  try {
    toast.info(`Sending stop command for ${camera.name}...`);
    const response = await axios.post(`${STREAM_CONTROL_API_BASE}/stream/${camera.streamName}/stop`);
    toast.success(response.data.message || `Stream '${camera.name}' stopped.`);
    // Refresh the status to update the UI
    await fetchCameras();
  } catch (error) {
    console.error('Failed to stop stream:', error);
    toast.error(error.response?.data?.error || `Failed to stop stream for ${camera.name}.`);
  }
};
// Toggle camera mode
const toggleCameraMode = async (camera) => {
  const newMode = camera.mode === 'highquality' ? 'lowquality' : 'highquality';

  try {
    await axios.patch(`/cameras/${camera.id}/mode`, {
      mode: newMode
    });

    // Update local state
    camera.mode = newMode;
    camera.last_updated = new Date().toLocaleString();

    toast.success(`Camera ${camera.name} mode changed to ${camera.mode === 'highquality' ? 'High Quality' : 'Low Quality'}`);
  } catch (error) {
    console.error('Failed to update camera mode:', error);
    toast.error(error.response?.data?.message || 'Failed to update camera mode');
  }
};

// Lifecycle hooks
onMounted(() => {
  fetchCameras();
});

const getStatusColor = (status: string) => {
  switch (status) {
    case 'live': return 'bg-green-500';
    case 'demo': return 'bg-yellow-500';
    case 'offline': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case 'live': return 'success';
    case 'demo': return 'warning';
    case 'offline': return 'destructive';
    default: return 'outline';
  }
};

const getModeBadgeVariant = (mode: string) => {
  return mode === 'highquality' ? 'secondary' : 'primary';
};
</script>

<template>

  <Head title="CCTV Management" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-6 bg-background">
      <!-- Stats Cards -->
      <div class="grid auto-rows-min gap-4 md:grid-cols-4">
        <template v-if="isLoading">
          <Skeleton class="h-[180px] w-full rounded-xl" v-for="i in 4" :key="i" />
        </template>
        <template v-else>
          <CardData title="Total Cameras" :value="totalCameras" icon="video" description="All registered cameras" />
          <CardData title="Online Cameras" :value="onlineCameras" icon="wifi"
            description="Currently accessible cameras" />
          <CardData title="Offline Cameras" :value="offlineCameras" icon="wifiOff"
            description="Currently inaccessible cameras" />
          <CardData title="Live Feeds" :value="liveCameras" icon="radioTower"
            description="Real-time streaming cameras" />
        </template>
      </div>

      <!-- Controls and Search Bar -->
      <div class="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <!-- Search Bar -->
        <div class="relative w-full md:w-64">
          <div class="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
            <Icon name="search" class="h-4 w-4 text-muted-foreground" />
          </div>
          <Input v-model="searchQuery" placeholder="Search cameras..." class="pl-10 pr-10" />
          <button v-if="searchQuery" @click="clearSearch" class="absolute inset-y-0 right-0 flex items-center pr-3">
            <Icon name="x" class="h-4 w-4 text-muted-foreground hover:text-foreground" />
          </button>
        </div>

        <!-- Column Layout Control -->
        <div class="flex space-x-4 items-center">
          <div class="flex items-center space-x-2">
            <Select v-model="gridLayout" class="w-40">
              <SelectTrigger id="grid-layout">
                <SelectValue placeholder="Select columns" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in columnOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>


          <Dialog v-model:open="showAddDialog">
            <DialogTrigger asChild>
              <Button variant="default" @click="showAddDialog = true">
                <Icon name="plus" class="mr-2 h-4 w-4" />
                Add Camera
              </Button>
            </DialogTrigger>
            <DialogContent>
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
                <!-- <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="sourceType" class="text-right">Source Type</Label>
                  <Select v-model="newCamera.sourceType" class="col-span-3" @update:modelValue="handleSourceTypeChange">
                    <SelectTrigger>
                      <SelectValue placeholder="Select source type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stream">Stream URL</SelectItem>
                      <SelectItem value="upload">Upload Video</SelectItem>
                    </SelectContent>
                  </Select>
                </div> -->

                <!-- Conditional fields based on sourceType -->
                <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="streamUrl" class="text-right">Stream URL</Label>
                  <Input id="streamUrl" v-model="newCamera.streamUrl" class="col-span-3"
                    placeholder="https://example.com/stream.m3u8" />
                </div>

                <!-- <div v-if="newCamera.sourceType === 'upload'" class="grid grid-cols-4 items-center gap-4">
                  <Label for="videoUpload" class="text-right">Upload Video</Label>
                  <div class="col-span-3">
                    <Input id="videoUpload" type="file" accept="video/*" @change="handleFileUpload"
                      class="col-span-3" />
                    <p v-if="newCamera.videoFile" class="text-sm text-gray-500 mt-1">
                      Selected: {{ newCamera.videoFile.name }}
                    </p>
                  </div>
                </div> -->

                <div class="grid grid-cols-4 items-center gap-4">
                  <Label for="status" class="text-right">Status</Label>
                  <Select v-model="newCamera.status" class="col-span-3">
                    <SelectTrigger>
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
                  <Select v-model="newCamera.mode" class="col-span-3">
                    <SelectTrigger>
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
        <Skeleton class="h-[300px] w-full rounded-xl" v-for="i in 4" :key="i" />
      </div>

      <div v-else-if="filteredCameras.length === 0"
        class="flex items-center justify-center h-64 bg-background/50 rounded-lg border border-dashed">
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
        <Card v-for="camera in filteredCameras" :key="camera.id"
          class="overflow-hidden hover:shadow-md hover:border-primary/30 dark:hover:border-primary/30 hover:-translate-y-1 transition-all duration-300">
          <CardHeader class="p-3 space-y-0">
            <div class="flex items-center justify-between">
              <CardTitle class="text-lg flex items-center">
                <div class="mr-2">
                  <div :class="['h-2 w-2 rounded-full animate-pulse inline-block mr-1', getStatusColor(camera.status)]">
                  </div>
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
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="icon" class="h-8 w-8">
                      <Icon name="moreVertical" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem v-if="!camera.isRunning" @click="startStream(camera)">
                      <Icon name="play" class="mr-2 h-4 w-4 text-green-500" />
                      <span>Start Stream</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem v-if="camera.isRunning" @click="stopStream(camera)">
                      <Icon name="square" class="mr-2 h-4 w-4 text-red-500" />
                      <span>Stop Stream</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="toggleCameraStatus(camera)">
                      <Icon name="refresh" class="mr-2 h-4 w-4" />
                      Change Status
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="toggleCameraMode(camera)">
                      <Icon name="switch" class="mr-2 h-4 w-4" />
                      Toggle Mode ({{ camera.mode === 'highquality' ? 'Low Quality' : 'High Quality' }})
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="removeCamera(camera.id)" class="text-destructive">
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
              <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width:100%;">
                <iframe style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" webkitAllowFullScreen
                  mozallowfullscreen allowfullscreen width="640" height="360" frameborder="0" allow="autoplay"
                  :src="getPlayerUrl(camera)"></iframe>
              </div>
              <div class="absolute top-2 right-2">
                <div class="flex space-x-2">
                  <div
                    class="flex items-center space-x-1 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
                    <div :class="['h-2 w-2 rounded-full animate-pulse', getStatusColor(camera.status)]"></div>
                    <span>{{ camera.status === 'live' ? 'LIVE' : 'DEMO' }}</span>
                  </div>
                  <div
                    class="flex items-center space-x-1 bg-black/80 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
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

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}
</style>