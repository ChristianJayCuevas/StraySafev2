<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref, onMounted, computed } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Head } from '@inertiajs/vue3';
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
import { Slider } from '@/components/ui/slider';
import { toast } from 'vue-sonner';
import axios from 'axios';
import Hls from 'hls.js';

const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'CCTV Management',
    href: '/cctv-management',
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
  hasPlayback?: boolean; // Whether the camera has playback capability
}

// State variables
const isLoading = ref(true);
const cameras = ref<CCTVCamera[]>([]);
const videoRefs = ref<{ [key: number]: HTMLVideoElement | null }>({});
const activeHls = ref<{ [key: number]: Hls | null }>({});
const gridLayout = ref('grid-cols-2'); // Default 2 columns
const displayMode = ref('grid'); // 'grid' or 'list'

// Playback controls state
const videoControls = ref<{ [key: number]: {
  isPlaying: boolean;
  showControls: boolean;
  playbackRate: number;
  loop: boolean;
  volume: number;
  currentTime: number;
  duration: number;
} }>({});

// Form state
const showAddDialog = ref(false);
const newCamera = ref<Partial<CCTVCamera>>({
  name: '',
  location: '',
  streamUrl: '',
  status: 'demo',
  hasPlayback: true
});

// Dashboard stats
const totalCameras = computed(() => cameras.value.length);
const onlineCameras = computed(() => cameras.value.filter(cam => cam.status !== 'offline').length);
const offlineCameras = computed(() => cameras.value.filter(cam => cam.status === 'offline').length);
const liveCameras = computed(() => cameras.value.filter(cam => cam.status === 'live').length);

// Mock data for development
const dummyData: CCTVCamera[] = [
  {
    id: 1,
    name: 'Main Entrance',
    location: 'Front Gate',
    streamUrl: 'https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8',
    status: 'live',
    lastUpdated: '2025-05-07 14:30',
    hasPlayback: true
  },
  {
    id: 2,
    name: 'Parking Area',
    location: 'North Lot',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'demo',
    lastUpdated: '2025-05-07 14:15',
    hasPlayback: true
  },
  {
    id: 3,
    name: 'Back Entrance',
    location: 'Loading Bay',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'live',
    lastUpdated: '2025-05-07 13:45',
    hasPlayback: false
  },
  {
    id: 4,
    name: 'Side Alley',
    location: 'East Wing',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'offline',
    lastUpdated: '2025-05-06 23:10',
    hasPlayback: true
  }
];

// Fetch cameras from API
const fetchCameras = async () => {
  try {
    // In a real app, you would fetch from your API
    // const response = await axios.get('/api/cameras');
    // cameras.value = response.data;
    
    // Using dummy data for development
    cameras.value = dummyData;
  } catch (error) {
    console.error('Failed to fetch cameras:', error);
    cameras.value = dummyData;
  } finally {
    isLoading.value = false;
  }
};

// Initialize HLS on each video element
const initializeVideoPlayers = () => {
  cameras.value.forEach(camera => {
    if (camera.status !== 'offline' && videoRefs.value[camera.id]) {
      const videoElement = videoRefs.value[camera.id];
      
      // Initialize video controls state if not already set
      if (!videoControls.value[camera.id]) {
        videoControls.value[camera.id] = {
          isPlaying: false,
          showControls: false,
          playbackRate: 1.0,
          loop: false,
          volume: 1.0,
          currentTime: 0,
          duration: 0
        };
      }
      
      // Set up event listeners for video element
      if (videoElement) {
        videoElement.loop = videoControls.value[camera.id].loop;
        videoElement.volume = videoControls.value[camera.id].volume;
        videoElement.playbackRate = videoControls.value[camera.id].playbackRate;
        
        // Event listeners for updating video control state
        videoElement.addEventListener('loadedmetadata', () => {
          videoControls.value[camera.id].duration = videoElement.duration;
        });
        
        videoElement.addEventListener('timeupdate', () => {
          videoControls.value[camera.id].currentTime = videoElement.currentTime;
        });
        
        videoElement.addEventListener('play', () => {
          videoControls.value[camera.id].isPlaying = true;
        });
        
        videoElement.addEventListener('pause', () => {
          videoControls.value[camera.id].isPlaying = false;
        });
      }
      
      // Destroy existing HLS instance if it exists
      if (activeHls.value[camera.id]) {
        activeHls.value[camera.id]?.destroy();
      }
      
      if (videoElement && Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          debug: false,
        });
        
        hls.loadSource(camera.streamUrl);
        hls.attachMedia(videoElement);
        
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          if (videoControls.value[camera.id].isPlaying) {
            videoElement.play().catch(err => {
              console.warn('Auto-play was prevented:', err);
            });
          }
        });
        
        activeHls.value[camera.id] = hls;
      } else if (videoElement && videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari which has native HLS support
        videoElement.src = camera.streamUrl;
        if (videoControls.value[camera.id].isPlaying) {
          videoElement.play().catch(err => {
            console.warn('Auto-play was prevented:', err);
          });
        }
      }
    }
  });
};

// Change grid layout
const setGridLayout = (cols: string) => {
  gridLayout.value = cols;
};

// Add a new camera
const addCamera = async () => {
  if (!newCamera.value.name || !newCamera.value.location || !newCamera.value.streamUrl) {
          toast.error('Please fill all required fields');
    return;
  }
  
  try {
    // In a real app, you would send to your API
    // const response = await axios.post('/api/cameras', newCamera.value);
    // const addedCamera = response.data;
    
    // Mock adding for development
    const addedCamera: CCTVCamera = {
      id: cameras.value.length + 1,
      name: newCamera.value.name || '',
      location: newCamera.value.location || '',
      streamUrl: newCamera.value.streamUrl || '',
      status: newCamera.value.status as 'live' | 'demo' | 'offline' || 'demo',
      lastUpdated: new Date().toLocaleString(),
      hasPlayback: true
    };
    
    cameras.value.push(addedCamera);
    
    // Initialize video controls state for this camera
    videoControls.value[addedCamera.id] = {
      isPlaying: false,
      showControls: false,
      playbackRate: 1.0,
      loop: false,
      volume: 1.0,
      currentTime: 0,
      duration: 0
    };
    
    toast.success('Camera added successfully');
    
    showAddDialog.value = false;
    newCamera.value = {
      name: '',
      location: '',
      streamUrl: '',
      status: 'demo'
    };
    
    // Initialize the new player after a short delay
    setTimeout(() => {
      if (videoRefs.value[addedCamera.id]) {
        initializeVideoPlayers();
      }
    }, 100);
    
  } catch (error) {
    console.error('Failed to add camera:', error);
    toast.error('Failed to add camera');
  }
};

// Remove a camera
const removeCamera = async (id: number) => {
  try {
    // In a real app, you would call your API
    // await axios.delete(`/api/cameras/${id}`);
    
    // Destroy HLS instance if it exists
    if (activeHls.value[id]) {
      activeHls.value[id]?.destroy();
      delete activeHls.value[id];
    }
    
    // Filter out the camera
    cameras.value = cameras.value.filter(camera => camera.id !== id);
    
    toast.success('Camera removed successfully');
  } catch (error) {
    console.error('Failed to remove camera:', error);
    toast.error('Failed to remove camera');
  }
};

// Toggle camera status (for demo purposes)
const toggleCameraStatus = (camera: CCTVCamera) => {
  const statusMap: { [key: string]: 'live' | 'demo' | 'offline' } = {
    'live': 'demo',
    'demo': 'offline',
    'offline': 'live'
  };
  
  camera.status = statusMap[camera.status];
  camera.lastUpdated = new Date().toLocaleString();
  
  // Reinitialize player if needed
  if (camera.status !== 'offline' && videoRefs.value[camera.id]) {
    initializeVideoPlayers();
  } else if (camera.status === 'offline' && activeHls.value[camera.id]) {
    activeHls.value[camera.id]?.destroy();
    delete activeHls.value[camera.id];
  }
  
  toast(`Camera ${camera.name} is now ${camera.status}`, {
    icon: camera.status === 'live' ? '🟢' : camera.status === 'demo' ? '🟡' : '🔴'
  });
};

// Clean up HLS instances on unmount
const cleanupPlayers = () => {
  Object.values(activeHls.value).forEach(hls => {
    if (hls) {
      hls.destroy();
    }
  });
  activeHls.value = {};
};

// Lifecycle hooks
onMounted(() => {
  fetchCameras().then(() => {
    setTimeout(() => {
      initializeVideoPlayers();
    }, 100);
  });
});

const handleVideoRef = (el: HTMLVideoElement | null, id: number) => {
  if (el) {
    videoRefs.value[id] = el;
  }
};

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
    case 'live': return 'default';
    case 'demo': return 'secondary';
    case 'offline': return 'destructive';
    default: return 'outline';
  }
};
</script>

<template>
  <Head title="CCTV Management" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <!-- Make sure to add the Toaster component from vue-sonner at the application level -->
    <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4">
      <!-- Stats Cards -->
      <div class="grid auto-rows-min gap-4 md:grid-cols-4">
        <template v-if="isLoading">
          <Skeleton class="h-[180px] w-full rounded-xl" v-for="i in 4" :key="i" />
        </template>
        <template v-else>
          <CardData 
            title="Total Cameras" 
            :value="totalCameras" 
            icon="video" 
            description="All registered cameras" 
          />
          <CardData 
            title="Online Cameras" 
            :value="onlineCameras" 
            icon="wifi" 
            description="Currently accessible cameras" 
          />
          <CardData 
            title="Offline Cameras" 
            :value="offlineCameras" 
            icon="wifiOff" 
            description="Currently inaccessible cameras" 
          />
          <CardData 
            title="Live Feeds" 
            :value="liveCameras" 
            icon="radioTower" 
            description="Real-time streaming cameras" 
          />
        </template>
      </div>

      <!-- Controls -->
      <div class="flex flex-wrap items-center justify-between gap-4">
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="setGridLayout('grid-cols-1')" :class="{ 'bg-primary/10': gridLayout === 'grid-cols-1' }">
            <Icon name="layout" class="mr-2 h-4 w-4" />
            1 Column
          </Button>
          <Button variant="outline" @click="setGridLayout('grid-cols-2')" :class="{ 'bg-primary/10': gridLayout === 'grid-cols-2' }">
            <Icon name="layoutGrid" class="mr-2 h-4 w-4" />
            2 Columns
          </Button>
          <Button variant="outline" @click="setGridLayout('grid-cols-3')" :class="{ 'bg-primary/10': gridLayout === 'grid-cols-3' }">
            <Icon name="layoutGrid" class="mr-2 h-4 w-4" />
            3 Columns
          </Button>
          <Button variant="outline" @click="setGridLayout('grid-cols-4')" :class="{ 'bg-primary/10': gridLayout === 'grid-cols-4' }">
            <Icon name="layoutGrid" class="mr-2 h-4 w-4" />
            4 Columns
          </Button>
        </div>
        
        <Dialog v-model:open="showAddDialog">
          <DialogTrigger asChild>
            <Button @click="showAddDialog = true">
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
              <div class="grid grid-cols-4 items-center gap-4">
                <Label for="streamUrl" class="text-right">Stream URL</Label>
                <Input id="streamUrl" v-model="newCamera.streamUrl" class="col-span-3" placeholder="https://example.com/stream.m3u8" />
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
              
              <!-- <div class="grid grid-cols-4 items-center gap-4">
                <Label for="hasPlayback" class="text-right">Has Playback</Label>
                <div class="col-span-3 flex items-center space-x-2">
                  <input 
                    type="checkbox" 
                    id="hasPlayback" 
                    v-model="newCamera.hasPlayback" 
                    class="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" 
                  />
                  <Label for="hasPlayback" class="text-sm">Enable playback controls for this camera</Label>
                </div>
              </div> -->
            </div>
            
            <DialogFooter>
              <Button variant="outline" @click="showAddDialog = false">Cancel</Button>
              <Button @click="addCamera">Add Camera</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <!-- Camera Grid -->
      <div v-if="isLoading" class="grid gap-4" :class="gridLayout">
        <Skeleton class="h-[300px] w-full rounded-xl" v-for="i in 4" :key="i" />
      </div>
      
      <div v-else-if="cameras.length === 0" class="flex items-center justify-center h-64">
        <div class="text-center">
          <Icon name="video-off" class="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <h3 class="text-lg font-medium">No Cameras Found</h3>
          <p class="text-muted-foreground mb-4">Add your first camera to start monitoring.</p>
          <Button @click="showAddDialog = true">
            <Icon name="plus" class="mr-2 h-4 w-4" />
            Add Camera
          </Button>
        </div>
      </div>
      
      <div v-else class="grid gap-4" :class="gridLayout">
        <Card 
          v-for="camera in cameras" 
          :key="camera.id"
          class="overflow-hidden hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300"
        >
          <CardHeader class="p-3 space-y-0">
            <div class="flex items-center justify-between">
              <CardTitle class="text-lg">{{ camera.name }}</CardTitle>
              <div class="flex items-center space-x-2">
                <Badge :variant="getStatusBadgeVariant(camera.status)">
                  {{ camera.status.toUpperCase() }}
                </Badge>
                <DropdownMenu>
                  <DropdownMenuTrigger>
                    <Button variant="ghost" size="icon" class="h-8 w-8">
                      <Icon name="moreVertical" class="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem @click="toggleCameraStatus(camera)">
                      Change Status
                    </DropdownMenuItem>
                    <DropdownMenuItem @click="removeCamera(camera.id)">
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
              </div>
            </div>
            <div v-else class="relative aspect-video">
              <video 
                :ref="el => handleVideoRef(el, camera.id)" 
                class="w-full h-full object-cover" 
                muted
                playsinline
                autoplay
              ></video>
              <div class="absolute top-2 right-2">
                <div class="flex items-center space-x-1 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
                  <div :class="['h-2 w-2 rounded-full animate-pulse', getStatusColor(camera.status)]"></div>
                  <span>{{ camera.status === 'live' ? 'LIVE' : 'DEMO' }}</span>
                </div>
              </div>
            </div>
          </CardContent>
          
          <CardFooter class="p-3 pt-2">
            <div class="flex justify-between items-center w-full text-sm">
              <span class="text-muted-foreground">{{ camera.location }}</span>
              <span class="text-xs text-muted-foreground">Updated: {{ camera.lastUpdated }}</span>
            </div>
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