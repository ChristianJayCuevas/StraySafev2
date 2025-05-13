<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { ref, onMounted, onBeforeUnmount, reactive, computed } from 'vue';
import { Head } from '@inertiajs/vue3';
import { Skeleton } from '@/components/ui/skeleton';
import Icon from '@/components/Icon.vue';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { toast } from 'vue-sonner';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import Hls from 'hls.js';

// Make elements draggable
import { useSortable } from '@vueuse/integrations/useSortable';
const breadcrumbs: BreadcrumbItem[] = [
  {
    title: 'CCTV Monitoring',
    href: '/cctvmonitoring',
  },
];
interface CCTVCamera {
  id: number;
  name: string;
  location: string;
  streamUrl: string;
  status: 'live' | 'demo' | 'offline';
}

// State variables
const isLoading = ref(true);
const cameras = ref<CCTVCamera[]>([]);
const videoRefs = ref<{ [key: number]: HTMLVideoElement | null }>({});
const cameraContainerRef = ref<HTMLElement | null>(null);
const activeHls = ref<{ [key: number]: Hls | null }>({});
const gridCols = ref('grid-cols-3'); // Default 3 columns
const isFullscreenMode = ref(false);
const fullscreenCameraId = ref<number | null>(null);
const isGridCompact = ref(false);

// Column options
const columnOptions = [
  { value: 'grid-cols-1', label: '1 Column' },
  { value: 'grid-cols-2', label: '2 Columns' },
  { value: 'grid-cols-3', label: '3 Columns' },
  { value: 'grid-cols-4', label: '4 Columns' },
  { value: 'grid-cols-5', label: '5 Columns' },
  { value: 'grid-cols-6', label: '6 Columns' },
];

// Mock data for development
const dummyData: CCTVCamera[] = [
  {
    id: 1,
    name: 'Main Entrance',
    location: 'Front Gate',
    streamUrl: 'https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8',
    status: 'live',
  },
  {
    id: 2,
    name: 'Parking Area',
    location: 'North Lot',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'demo',
  },
  {
    id: 3,
    name: 'Back Entrance',
    location: 'Loading Bay',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'live',
  },
  {
    id: 4,
    name: 'Side Alley',
    location: 'East Wing',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'offline',
  },
  {
    id: 5,
    name: 'Reception',
    location: 'Main Building',
    streamUrl: 'https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8',
    status: 'live',
  },
  {
    id: 6,
    name: 'Employee Entrance',
    location: 'West Wing',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'live',
  },
  {
    id: 7,
    name: 'Warehouse A',
    location: 'Storage Area',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'offline',
  },
  {
    id: 8,
    name: 'Warehouse B',
    location: 'Storage Area',
    streamUrl: 'https://skynewsau-live.akamaized.net/hls/live/2002689/skynewsau-extra1/master.m3u8',
    status: 'demo',
  },
  {
    id: 9,
    name: 'Executive Parking',
    location: 'VIP Area',
    streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
    status: 'live',
  },
];

// Initialize drag-and-drop functionality
const sortableOptions = reactive({
  animation: 150,
  ghostClass: 'opacity-40',
});

const initDraggable = () => {
  if (cameraContainerRef.value) {
    const { start, stop } = useSortable(cameraContainerRef.value, cameras.value, {
      ...sortableOptions,
      // Add onEnd callback to reinitialize videos after dragging
      onEnd: () => {
        // Wait for DOM to update
        setTimeout(() => {
          cleanupPlayers();
          initializeVideoPlayers();
        }, 300);
      }
    });
    
    start();
    
    onBeforeUnmount(() => {
      stop();
    });
  }
};


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
    toast.error('Failed to load cameras');
    cameras.value = dummyData;
  } finally {
    isLoading.value = false;
    
    // Initialize sortable after cameras are loaded
    setTimeout(() => {
      initDraggable();
    }, 500);
  }
};

// Initialize HLS on each video element
const initializeVideoPlayers = () => {
  cameras.value.forEach(camera => {
    if (camera.status !== 'offline' && videoRefs.value[camera.id]) {
      const videoElement = videoRefs.value[camera.id];
      
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
          videoElement.play().catch(err => {
            console.warn('Auto-play was prevented:', err);
          });
        });
        
        activeHls.value[camera.id] = hls;
      } else if (videoElement && videoElement.canPlayType('application/vnd.apple.mpegurl')) {
        // For Safari which has native HLS support
        videoElement.src = camera.streamUrl;
        videoElement.play().catch(err => {
          console.warn('Auto-play was prevented:', err);
        });
      }
    }
  });
};

// Toggle fullscreen mode for a specific camera
const toggleFullscreen = (cameraId: number) => {
  if (isFullscreenMode.value && fullscreenCameraId.value === cameraId) {
    // Exit fullscreen
    isFullscreenMode.value = false;
    fullscreenCameraId.value = null;
    
    // Clean up and re-initialize all players after a short delay
    cleanupPlayers();
    setTimeout(() => {
      initializeVideoPlayers();
    }, 300);
  } else {
    // Enter fullscreen for the selected camera
    isFullscreenMode.value = true;
    fullscreenCameraId.value = cameraId;
    
    // Clean up and re-initialize the fullscreen player after a short delay
    cleanupPlayers();
    setTimeout(() => {
      if (fullscreenCameraId.value !== null) {
        const camera = cameras.value.find(cam => cam.id === fullscreenCameraId.value);
        if (camera && camera.status !== 'offline' && videoRefs.value[camera.id]) {
          const videoElement = videoRefs.value[camera.id];
          
          if (videoElement && Hls.isSupported()) {
            const hls = new Hls({
              enableWorker: true,
              lowLatencyMode: true,
              debug: false,
            });
            
            hls.loadSource(camera.streamUrl);
            hls.attachMedia(videoElement);
            
            hls.on(Hls.Events.MANIFEST_PARSED, () => {
              videoElement.play().catch(err => {
                console.warn('Auto-play was prevented:', err);
              });
            });
            
            activeHls.value[camera.id] = hls;
          }
        }
      }
    }, 300);
  }
};

// Toggle compact mode
const toggleCompactMode = () => {
  isGridCompact.value = !isGridCompact.value;
};

// Handle video element refs
const handleVideoRef = (el: HTMLVideoElement | null, id: number) => {
  if (el) {
    videoRefs.value[id] = el;
  }
};

// Clean up HLS instances on unmount
const cleanupPlayers = () => {
  Object.entries(activeHls.value).forEach(([id, hls]) => {
    if (hls) {
      try {
        hls.destroy();
      } catch (err) {
        console.error(`Error destroying HLS instance for camera ${id}:`, err);
      }
    }
  });
  activeHls.value = {};
};

// Keyboard shortcuts for navigation
const handleKeyDown = (e: KeyboardEvent) => {
  // ESC to exit fullscreen
  if (e.key === 'Escape' && isFullscreenMode.value) {
    isFullscreenMode.value = false;
    fullscreenCameraId.value = null;
    
    // Clean up and re-initialize all players
    cleanupPlayers();
    setTimeout(() => {
      initializeVideoPlayers();
    }, 300);
  }
  
  // F key to toggle browser fullscreen (different from our app's fullscreen mode)
  if (e.key === 'f' && fullscreenCameraId.value) {
    const videoElement = videoRefs.value[fullscreenCameraId.value];
    if (videoElement) {
      if (!document.fullscreenElement) {
        videoElement.requestFullscreen().catch(err => {
          console.error('Error attempting to enable fullscreen:', err);
        });
      } else if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    }
  }
};
// Get status indicator class
const getStatusIndicatorClass = (status: string) => {
  switch (status) {
    case 'live': return 'bg-green-500';
    case 'demo': return 'bg-yellow-500';
    case 'offline': return 'bg-red-500';
    default: return 'bg-gray-500';
  }
};

// Get camera by ID (used for fullscreen mode)
const getFullscreenCamera = computed(() => {
  if (!fullscreenCameraId.value) return null;
  return cameras.value.find(cam => cam.id === fullscreenCameraId.value) || null;
});

// Lifecycle hooks
onMounted(() => {
  fetchCameras().then(() => {
    setTimeout(() => {
      initializeVideoPlayers();
    }, 300);
  });
  
  // Add event listener for keyboard shortcuts
  window.addEventListener('keydown', handleKeyDown);
});

onBeforeUnmount(() => {
  cleanupPlayers();
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<template>
  <Head title="CCTV Monitoring" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="h-full w-full relative overflow-hidden bg-background">
      <!-- Controls overlay -->
      <div class="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-2 backdrop-blur-sm">
        <div class="flex items-center space-x-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" class="h-8 w-8 text-gray-300 hover:text-white">
                  <Icon name="video" class="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>CCTV Monitoring</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <div class="text-sm font-medium text-gray-300">
            {{ new Date().toLocaleString() }}
          </div>
        </div>
        
        <div class="flex items-center space-x-3">
          <div class="flex items-center space-x-1">
            <Select v-model="gridCols" class="w-40">
              <SelectTrigger class="h-8 border-gray-800 text-gray-300 text-xs">
                <SelectValue placeholder="Column layout" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="option in columnOptions" :key="option.value" :value="option.value">
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  class="h-8 w-8 text-gray-300 hover:text-white"
                  @click="toggleCompactMode"
                >
                  <Icon :name="isGridCompact ? 'maximize' : 'minimize'" class="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{{ isGridCompact ? 'Expand' : 'Compact' }} view</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>
      
      <!-- Loading state -->
      <div v-if="isLoading" class="grid gap-2 p-6 pt-14" :class="gridCols">
        <Skeleton class="aspect-video w-full rounded-md" v-for="i in 6" :key="i" />
      </div>
      
      <!-- Fullscreen mode -->
      <div v-else-if="isFullscreenMode && getFullscreenCamera" class="w-full h-full pt-10">
  <div class="relative h-full w-full bg-black flex items-center justify-center">
    <video 
      v-if="getFullscreenCamera.status !== 'offline'"
      :ref="el => handleVideoRef(el, getFullscreenCamera.id)" 
      class="w-full h-full object-contain" 
      muted
      playsinline
      autoplay
    ></video>
    
    <div v-else class="flex flex-col items-center justify-center">
      <Icon name="video-off" class="h-20 w-20 text-gray-600 mb-4" />
      <span class="text-gray-400 text-lg">Camera offline</span>
    </div>
    
    <!-- Camera info overlay -->
    <div class="absolute top-2 left-2 flex items-center space-x-2 bg-black/70 backdrop-blur-sm rounded px-2 py-1">
      <div :class="['h-2 w-2 rounded-full animate-pulse', getStatusIndicatorClass(getFullscreenCamera.status)]"></div>
      <span class="text-white text-sm">{{ getFullscreenCamera.name }}</span>
      <span class="text-gray-400 text-xs">{{ getFullscreenCamera.location }}</span>
    </div>
    
    <!-- Improved exit fullscreen button with better visibility and hover state -->
    <Button 
      variant="outline" 
      size="icon"
      class="absolute top-2 right-2 h-8 w-8 text-white bg-gray-800/80 hover:bg-red-600 hover:text-white transition-colors"
      @click="toggleFullscreen(getFullscreenCamera.id)"
    >
      <Icon name="x" class="h-4 w-4" />
    </Button>
  </div>
</div>
      
      <!-- Normal grid mode -->
      <div 
        v-else 
        ref="cameraContainerRef"
        class="grid gap-2 p-2 pt-14 w-full"
        :class="[gridCols, { 'camera-compact': isGridCompact }]"
      >
        <div 
          v-for="camera in cameras" 
          :key="camera.id"
          class="relative group overflow-hidden transition-all duration-300 rounded-md"
          :class="{ 
            'border border-gray-800 hover:border-gray-700': true,
            'cursor-move': !isFullscreenMode
          }"
        >
          <!-- Video feed -->
          <div class="relative aspect-video bg-gray-900 w-full h-full">
            <video 
              v-if="camera.status !== 'offline'"
              :ref="el => handleVideoRef(el, camera.id)" 
              class="w-full h-full object-cover" 
              muted
              playsinline
              autoplay
            ></video>
            
            <div v-else class="flex flex-col items-center justify-center h-full">
              <Icon name="video-off" class="h-10 w-10 text-gray-600 mb-2" />
              <span class="text-gray-400 text-sm">Camera offline</span>
            </div>
            
            <!-- Camera info overlay -->
            <div class="absolute bottom-0 left-0 right-0 bg-black/70 backdrop-blur-sm p-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center">
                  <div :class="['h-2 w-2 rounded-full animate-pulse mr-2', getStatusIndicatorClass(camera.status)]"></div>
                  <span class="text-white text-sm truncate mr-1">{{ camera.name }}</span>
                  <span class="text-gray-400 text-xs truncate hidden sm:inline-block">{{ camera.location }}</span>
                </div>
                
                <!-- Controls (only visible on hover) -->
                <div class="opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center space-x-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          class="h-6 w-6 text-gray-300 hover:text-white rounded-sm"
                          @click="toggleFullscreen(camera.id)"
                        >
                          <Icon name="maximize" class="h-3 w-3" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">
                        <p>Fullscreen</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
            
            <!-- Status indicator in top right corner -->
            <div class="absolute top-2 right-2">
              <div :class="['h-4 w-4 rounded-full', getStatusIndicatorClass(camera.status)]"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </AppLayout>
</template>

<style scoped>
/* For animation of status dot */
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

/* For compact mode */
.camera-compact {
  gap: 1px !important;
}
.camera-compact > div {
  border-width: 1px !important;
  border-radius: 0 !important;
}
</style>