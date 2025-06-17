<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import { ref, onMounted, computed, watch, onUnmounted } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import CardAnimal from '@/components/CardAnimal.vue';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Icon from '@/components/Icon.vue'
import {
  Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import axios from 'axios';
import {
  createColumnHelper, getCoreRowModel, getFilteredRowModel, getPaginationRowModel,
  getSortedRowModel, useVueTable, type PaginationState,
} from '@tanstack/vue-table';
import {
  Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationPrevious, PaginationNext,
} from '@/components/ui/pagination';
import {
  Tabs, TabsContent, TabsList, TabsTrigger
} from '@/components/ui/tabs';
import {toast} from 'vue-sonner';

const breadcrumbs: BreadcrumbItem[] = [
  { title: 'Detections', href: '/detections' },
];
const NOTIFICATION_LATITUDE = "14.5995"; // Example: Manila, Philippines
const NOTIFICATION_LONGITUDE = "120.9842"; 
const pollableCameras = ref<{ name: string; source: string; }[]>([]);
const STREAM_CONTROL_API_BASE = 'https://straysafe.me/streamcontrol';
interface Detection {
  id: number; // Internal DB ID for your Laravel backend
  external_api_id: string | null;
  external_api_type: string | null;
  api_id?: string | null;
  api_type?: string | null;
  breed: string | null;
  contact_number: string | null;
  frame_base64: string | null;
  has_leash: boolean | null;
  is_registered: boolean | null;
  leash_color: string | null;
  pet_name: string | null;
  pet_type: string | null;
  reg_base64: string | null;
  timestamp: string;
  external_data_timestamp: string | null;
  // NEW FIELDS: Meta data from Python backend
  rtsp_url: string | null;
  track_id: string | null;
  stable_class: string | null;
  detection_timestamp: string | null; // ISO timestamp from original detection
  similarity_score: number | null; // 0-1 similarity score
  // For notification context
  latitude?: string | null;
  longitude?: string | null;
  camera_name?: string | null;
  // For notifications with saved images
  frame_path?: string | null; 
  reg_path?: string | null;
}
// NEW: Interface for Registered Pet
interface RegisteredPet {
  id: number;         // Registered Pet's own ID
  user_id: number;    // Owner's User ID
  pet_name: string;
  breed: string;
  pet_type: string; // e.g., 'dog', 'cat'
  // ... any other relevant fields from your registered_pets table
}

interface LaravelPagination<T> {
  current_page: number; data: T[]; first_page_url: string; from: number | null;
  last_page: number; last_page_url: string;
  links: { url: string | null; label: string; active: boolean }[];
  next_page_url: string | null; path: string; per_page: number;
  prev_page_url: string | null; to: number | null; total: number;
}
const notifiedMatches = ref<Set<string>>(new Set());
const isLoading = ref(true);
const isPolling = ref(false);
let pollingIntervalId: number | undefined = undefined;
const POLLING_INTERVAL_MS = 6000; // Keep it higher for production (e.g., 10-30 seconds)
const isMonitoringActive = ref(false);

const detections = ref<Detection[]>([]);
const registeredPets = ref<RegisteredPet[]>([]); // NEW: Store registered pets
const isLoadingRegisteredPets = ref(true);      // NEW: Loading state for registered pets

const searchQuery = ref('');
const backendPaginationData = ref<Omit<LaravelPagination<any>, 'data'>>({
  current_page: 1, last_page: 1, per_page: 10, total: 0, from: null, to: null,
  first_page_url: '', last_page_url: '', links: [], next_page_url: null, path: '', prev_page_url: null,
});
const tablePagination = ref<PaginationState>({ pageIndex: 0, pageSize: 10 });

import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const showDeleteConfirmDialog = ref(false);
const detectionToDelete = ref<Detection | null>(null);

function confirmDeleteDetection(detection: Detection) {
  detectionToDelete.value = detection;
  showDeleteConfirmDialog.value = true;
}

function formatBase64Image(base64String: string | null, imageTypeIfRaw: string = 'png'): string | null {
  if (!base64String) return null;
  if (base64String.startsWith('data:image')) return base64String;
  return `data:image/${imageTypeIfRaw};base64,${base64String}`;
}

function formatBackendTimestamp(isoTimestamp: string | null | undefined): string {
  if (!isoTimestamp) return 'N/A';
  try {
    const date = new Date(isoTimestamp);
    const optionsDate: Intl.DateTimeFormatOptions = { year: 'numeric', month: 'short', day: 'numeric' };
    const optionsTime: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit', hour12: true };
    return `${date.toLocaleDateString(undefined, optionsDate)}, ${date.toLocaleTimeString(undefined, optionsTime)}`;
  } catch (e) {
    return isoTimestamp;
  }
}

const filteredDetections = computed(() => {
  if (!searchQuery.value) return detections.value;
  const query = searchQuery.value.toLowerCase();
  return detections.value.filter(animal =>
    (animal.pet_type && animal.pet_type.toLowerCase().includes(query)) ||
    (animal.breed && animal.breed.toLowerCase().includes(query)) ||
    (animal.pet_name && animal.pet_name.toLowerCase().includes(query)) ||
    (animal.leash_color && animal.leash_color.toLowerCase().includes(query)) ||
    (animal.contact_number && animal.contact_number.toLowerCase().includes(query))
  );
});
async function fetchPollableCameras() {
  try {
    const response = await axios.get(`${STREAM_CONTROL_API_BASE}/stream/status`);
    const streamStatuses = response.data;
    
    // Filter for only the cameras that are currently running
    pollableCameras.value = Object.entries(streamStatuses)
      .filter(([name, details]) => (details as any).status === 'running')
      .map(([name, details]) => ({
        name: name,
        source: (details as any).source,
      }));
      
    console.log('Monitoring will check these active cameras:', pollableCameras.value.map(c => c.name));
    
  } catch (error) {
    console.error('Failed to fetch list of active cameras for polling:', error);
    toast.error("Could not get active camera list for monitoring.");
    pollableCameras.value = []; // Clear the list on error
  }
}
const columnHelper = createColumnHelper<Detection>();
const columns = [
  columnHelper.accessor('pet_type', { header: 'Pet Type', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('breed', { header: 'Breed', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('pet_name', { header: 'Pet Name', cell: info => info.getValue() || 'N/A' }),
  columnHelper.accessor('has_leash', { header: 'Has Leash?', cell: info => info.getValue() === null ? 'N/A' : (info.getValue() ? 'Yes' : 'No') }),
  columnHelper.accessor('is_registered', { header: 'Registered?', cell: info => info.getValue() === null ? 'N/A' : (info.getValue() ? 'Yes' : 'No') }),
  columnHelper.accessor('timestamp', { header: 'Time Stored', cell: info => info.getValue() || 'N/A' }),
  columnHelper.display({
    id: 'actions',
    header: 'Actions',
    cell: ({ row }) => h(
        Button,
        { variant: 'destructive', size: 'sm', onClick: () => confirmDeleteDetection(row.original) },
        () => [h(Icon, { name: 'Trash2', class: 'h-4 w-4 mr-1' }), 'Delete']
      ),
  }),
];

const table = useVueTable({
  get data() { return filteredDetections.value; },
  columns,
  getRowId: row => String(row.id),
  manualPagination: true,
  pageCount: computed(() => backendPaginationData.value.last_page),
  state: {
    get pagination() { return tablePagination.value; },
    get globalFilter() { return searchQuery.value; },
  },
  onPaginationChange: (updater) => {
    const newPagination = typeof updater === 'function' ? updater(tablePagination.value) : updater;
    tablePagination.value = newPagination;
    loadDetectionsFromBackend();
  },
  getCoreRowModel: getCoreRowModel(),
  getSortedRowModel: getSortedRowModel(),
  getFilteredRowModel: getFilteredRowModel(),
});

watch(searchQuery, () => { /* Client-side search on current page */ });


// --- Registered Pets Fetching ---
async function fetchRegisteredPets() {
  isLoadingRegisteredPets.value = true;
  try {
    interface RegisteredPetsApiResponse {
      status: string;
      data: RegisteredPet[]; 
    }
    const response = await axios.get<RegisteredPetsApiResponse>('/api/mobileregisteredanimals'); 

    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      registeredPets.value = response.data.data;
      console.log('Registered pets loaded:', registeredPets.value.length);
    } else {
      console.error('Failed to fetch registered pets or unexpected response structure:', response.data);
      toast.error("Error Loading Registered Pets", { description: "Received an invalid response from the server." });
      registeredPets.value = [];
    }
  } catch (error) {
    console.error('Error fetching registered pets:', error);
    toast.error("Error Loading Registered Pets", { description: "Could not fetch the list of registered pets." });
    registeredPets.value = [];
  } finally {
    isLoadingRegisteredPets.value = false;
  }
}
function isActualRegisteredMatch(detectedAnimal: Detection): RegisteredPet | undefined {
  if (!detectedAnimal.pet_name) {
    return undefined; // Cannot match without these details
  }
  if (isLoadingRegisteredPets.value || registeredPets.value.length === 0) {
      return undefined; // Don't attempt to match if registered pets aren't loaded
  }

  const detectedNameLower = detectedAnimal.pet_name.toLowerCase().trim();

  return registeredPets.value.find(regPet =>
    regPet.pet_name.toLowerCase().trim() === detectedNameLower
  );
}
// --- Notification Sending ---
async function sendNewDetectionNotification(detectedAnimal: Detection, savedDetectionPaths?: { frame_path?: string; reg_path?: string; }) {
  const NOTIFICATION_URL = 'https://straysafe.me/send-notification';

  const detectionKey = `${detectedAnimal.camera_name}-${detectedAnimal.track_id}`;
  if (notifiedMatches.value.has(detectionKey)) {
    console.log(`General notification for detectionKey ${detectionKey} already sent. Skipping.`);
    return;
  }

  let bodyLines = [
    `A ${detectedAnimal.pet_type || 'new animal'} was detected.`,
    `Location: Near Camera "${detectedAnimal.camera_name || 'unnamed'}"`,
    `Latitude: ${NOTIFICATION_LATITUDE}, Longitude: ${NOTIFICATION_LONGITUDE}`,
  ];

  if (detectedAnimal.breed) bodyLines.push(`Detected Breed: ${detectedAnimal.breed}`);
  if (detectedAnimal.has_leash) bodyLines.push(`Collar/Leash: Yes (Color: ${detectedAnimal.leash_color || 'Unknown'})`);
  else bodyLines.push(`Collar/Leash: No`);
  
  const bodyMessage = bodyLines.join('\n');

  // Prioritize server-side URL over base64
  const notificationImage = savedDetectionPaths?.frame_path ||
                         savedDetectionPaths?.reg_path ||
                         detectedAnimal.frame_base64 || 
                         'https://straysafe.me/images/default-pet-notification.png';

  const payload = {
    user_id: 3, // Send to a default admin user ID
    title: `New Animal Detected: ${detectedAnimal.pet_type?.toUpperCase() || 'Unknown'}`,
    body: bodyMessage,
    action: '/mobilemap',
    image: notificationImage,
  };

  console.log('Sending generic detection notification:', payload);
  console.log('Using image:', notificationImage);

  try {
    await axios.post(NOTIFICATION_URL, payload);
    toast.success("New Detection Alert Sent!", {
      description: `Notified admin about the new ${detectedAnimal.pet_type}.`
    });
    notifiedMatches.value.add(detectionKey);
  } catch (error: any) {
    console.error('Failed to send generic detection notification:', error.response?.data || error.message);
    toast.error("Generic Notification Failed", {
      description: `Could not send alert for the new detection.`
    });
  }
}
async function sendPetMatchNotification(userId: number, detectedAnimal: Detection, matchedRegisteredPet: RegisteredPet, savedDetectionPaths?: { frame_path?: string, reg_path?: string }) {
  const NOTIFICATION_URL = 'https://straysafe.me/send-notification';

  const matchKey = `${detectedAnimal.camera_name}-${detectedAnimal.track_id}-${matchedRegisteredPet.id}`;
  if (notifiedMatches.value.has(matchKey)) {
    console.log(`Notification for matchKey ${matchKey} already sent this session. Skipping.`);
    return;
  }

  let bodyLines = [
    `A pet similar to your registered pet, ${matchedRegisteredPet.pet_name}, was detected.`,
    `Location: Near Camera "${detectedAnimal.camera_name || 'unnamed'}"`,
    `Latitude: ${NOTIFICATION_LATITUDE}, Longitude: ${NOTIFICATION_LONGITUDE}`,
  ];
  
  if (detectedAnimal.breed) bodyLines.push(`Detected Breed: ${detectedAnimal.breed}`);
  if (detectedAnimal.has_leash) bodyLines.push(`Detected Collar/Leash: Yes (Color: ${detectedAnimal.leash_color || 'Unknown'})`);
  else bodyLines.push(`Detected Collar/Leash: No`);

  const bodyMessage = bodyLines.join('\n');
  
  // Apply the same image sending logic as origdetection.vue
  let notificationImage = savedDetectionPaths?.frame_path || 
                         savedDetectionPaths?.reg_path || 
                         detectedAnimal.frame_base64 || 
                         detectedAnimal.reg_base64 || 
                         'https://straysafe.me/images/default-pet-notification.png';

  const payload = {
    user_id: userId,
    title: `Potential Match Found for Your Pet: ${matchedRegisteredPet.pet_name}!`,
    body: bodyMessage,
    action: '/mobilemap',
    image: notificationImage,
  };

  console.log('Sending notification payload:', payload);
  console.log('Using image:', notificationImage);

  try {
    const response = await axios.post(NOTIFICATION_URL, payload);
    console.log('Notification sent successfully:', response.data);
    toast.success("Match Notification Sent!", { 
      description: `Owner of ${matchedRegisteredPet.pet_name} has been notified.` 
    });
    notifiedMatches.value.add(matchKey);
  } catch (error: any) {
    console.error('Failed to send notification:', error.response?.data || error.message);
    toast.error("Notification Failed", { 
      description: `Could not notify owner of ${matchedRegisteredPet.pet_name}` 
    });
  }
}

// --- Enhanced Polling Logic ---
// async function pollExternalAPIAndStore() {
//   if (isPolling.value) return; 
//   if (isLoadingRegisteredPets.value) {
//     console.log('Polling paused: Registered pets data is still loading.');
//     return;
//   }
//   if (pollableCameras.value.length === 0) {
//     console.log("Polling skipped: No active cameras detected.");
//     return;
//   }
  
//   isPolling.value = true;
//   console.log(`Polling ${pollableCameras.value.length} active camera(s)...`);

//   for (const camera of pollableCameras.value) {
//     const cameraFolderName = camera.name;
//     const API_URL = `${STREAM_CONTROL_API_BASE}/check_new_image_from_camera?camera_folder=${cameraFolderName}`;

//     try {
//       const response = await axios.get<Detection>(API_URL);
//       const detectedAnimalData = response.data;
      
//       if (detectedAnimalData && detectedAnimalData.pet_name) {
//         console.log(`[${cameraFolderName}] New detection received:`, detectedAnimalData);

//         const detectionPayload = {
//           // Keep existing payload structure
//           external_api_id: String(detectedAnimalData.pet_name),
//           external_api_type: detectedAnimalData.pet_type,
//           breed: detectedAnimalData.breed || null,
//           contact_number: detectedAnimalData.contact_number === 'none' ? null : (detectedAnimalData.contact_number || null),
//           frame_base64: detectedAnimalData.frame_base64 || null,
//           reg_base64: detectedAnimalData.reg_base64 || null,
//           has_leash: typeof detectedAnimalData.has_leash === 'boolean' ? detectedAnimalData.has_leash : null,
//           is_registered: typeof detectedAnimalData.is_registered === 'boolean' ? detectedAnimalData.is_registered : null,
//           leash_color: detectedAnimalData.leash_color === 'none' ? null : (detectedAnimalData.leash_color || null),
//           pet_name: detectedAnimalData.pet_name === 'none' ? null : (detectedAnimalData.pet_name || null),
//           pet_type: detectedAnimalData.pet_type,
//           camera_name: cameraFolderName, 
//           rtsp_url: detectedAnimalData.rtsp_url || camera.source,
//           track_id: detectedAnimalData.track_id || null,
//           stable_class: detectedAnimalData.stable_class || null,
//           detection_timestamp: detectedAnimalData.timestamp || null,
//           similarity_score: typeof detectedAnimalData.similarity_score === 'number' ? detectedAnimalData.similarity_score : null,
//         };
//         await handleNewDetection(detectionPayload); 
//       }
//     } catch (error: any) {
//       if (error.response && error.response.status === 200 && error.response.data.message) {
//         // console.log(`[${cameraFolderName}] No new matches.`);
//       } else {
//         console.warn(`[${cameraFolderName}] Error polling:`, error.message);
//       }
//     }
//   }
//   isPolling.value = false;
// }
async function pollExternalAPIAndStore() {
  if (isPolling.value) return;
  if (isLoadingRegisteredPets.value) {
    console.log('Polling paused: Registered pets data is still loading.');
    return;
  }
  isPolling.value = true;

  const API_URL = 'https://straysafe.me/checknewimage';

  try {
    const response = await axios.get<Detection>(API_URL);
    const detectedAnimalData = response.data;

    if (detectedAnimalData && Object.keys(detectedAnimalData).length > 0 && detectedAnimalData.pet_name && detectedAnimalData.pet_type) {
      console.log('Poll: New detection received:', detectedAnimalData);

      const detectionPayload = {
        external_api_id: String(detectedAnimalData.pet_name),
        external_api_type: detectedAnimalData.pet_type,
        breed: detectedAnimalData.breed || null,
        contact_number: detectedAnimalData.contact_number === 'none' ? null : (detectedAnimalData.contact_number || null),
        frame_base64: detectedAnimalData.frame_base64|| detectedAnimalData.frame_base64 || null,
        reg_base64: detectedAnimalData.reg_base64  || detectedAnimalData.reg_base64 || null,
        has_leash: typeof detectedAnimalData.has_leash === 'boolean' ? detectedAnimalData.has_leash : null,
        is_registered: typeof detectedAnimalData.is_registered === 'boolean' ? detectedAnimalData.is_registered : null,
        leash_color: detectedAnimalData.leash_color === 'none' ? null : (detectedAnimalData.leash_color || null),
        pet_name: detectedAnimalData.pet_name === 'none' ? null : (detectedAnimalData.pet_name || null),
        pet_type: detectedAnimalData.pet_type,
        rtsp_url: detectedAnimalData.rtsp_url || null,
        track_id: detectedAnimalData.track_id || null,
        stable_class: detectedAnimalData.stable_class || null,
        detection_timestamp: detectedAnimalData.timestamp || null,
        similarity_score: typeof detectedAnimalData.similarity_score === 'number' ? detectedAnimalData.similarity_score : null,
      };

      // Save the detection to your backend
      try {
        const backendResponse = await axios.post('/animal-detections', detectionPayload);
        let refreshedList = false;
        let savedDetection = null;

        if (backendResponse.status === 201 || backendResponse.status === 200) {
          // Get the saved detection with file paths
          const savedDetectionId = backendResponse.data.data.id; // Assuming your Laravel response includes the ID
          
          try {
            const getResponse = await axios.get(`/animal-detections/${savedDetectionId}`);
            savedDetection = getResponse.data;
            
            console.log('Retrieved saved detection with paths:', {
              id: savedDetection.id,
              frame_path: savedDetection.frame_path,
              reg_path: savedDetection.reg_path,
              external_api_id: savedDetection.external_api_id
            });
            
            // Now you have access to the file paths:
            // savedDetection.frame_path - path to the saved frame image
            // savedDetection.reg_path - path to the saved registration image
            
          } catch (getError) {
            console.error('Failed to retrieve saved detection:', getError);
            // Continue with the original flow even if GET fails
            savedDetection = backendResponse.data.data;
          }

          if (backendResponse.status === 201) {
            toast.success("New Detection Saved!", { 
              description: `From ${detectionPayload.rtsp_url || 'camera'}` 
            });
          }
          refreshedList = true;
        }

        if (refreshedList) {
          await loadDetectionsFromBackend(); // Refresh the displayed list of detections
        }

        // Use savedDetection for further processing if needed
        // For example, you could pass the file paths to the notification function
        if (savedDetection && detectedAnimalData.pet_name && detectedAnimalData.breed) {
          const detectedNameLower = detectedAnimalData.pet_name.toLowerCase();

          for (const regPet of registeredPets.value) {
            if (
              regPet.pet_name.toLowerCase() === detectedNameLower
            ) {
              console.log(`MATCH FOUND: Detected ${detectedAnimalData.pet_name} (${detectedAnimalData.breed}) matches registered ${regPet.pet_name} (${regPet.breed}) owned by user ${regPet.id}`);
              
              // Now you can pass the file paths to the notification function
              await sendPetMatchNotification(regPet.id, detectedAnimalData, regPet, {
                frame_path: savedDetection.frame_path,
                reg_path: savedDetection.reg_path
              });
            }
          }
        }

      } catch (postError: any) {
        console.error('Poll: Failed POST to backend /animal-detections:', postError.response?.data || postError.message, 'Payload:', detectionPayload);
        toast.error("Error Saving Detection", { description: postError.response?.data?.message || postError.message });
      }

    } else {
       console.log('Poll: No new valid data from /checknewimage. Data:', detectedAnimalData);
    }
  } catch (error: any) {
    if (error.response && error.response.status === 204) {
      // console.log('Poll: No new image data (204 No Content).');
    } else {
      console.warn(`Poll: Failed to fetch from /checknewimage:`, error.response?.status, error.message);
    }
  } finally {
    isPolling.value = false;
  }
}
// ** NEW: Helper function implementing the POST -> GET -> Notify flow **
// async function handleNewDetection(detectionPayload: any) {
//     try {
//         // --- 1. Save the detection to your Laravel backend ---
//         const backendResponse = await axios.post('/animal-detections', detectionPayload);
//         let savedDetection = null;

//         if (backendResponse.status === 201 || backendResponse.status === 200) {
//             await loadDetectionsFromBackend(); // Refresh the UI list
//             toast.success("New Detection Saved!", { 
//               description: `From camera: ${detectionPayload.camera_name}` 
//             });

//             // Get the ID from the POST response, which is nested under 'data'
//             const savedDetectionId = backendResponse.data?.data?.id;

//             if (!savedDetectionId) {
//                 console.error("Backend response did not include an ID. Using base64 for notifications.");
//                 savedDetection = detectionPayload;
//             } else {
//                 try {
//                     // --- 2. GET the record back to retrieve server-side image paths ---
//                     const getResponse = await axios.get(`/animal-detections/${savedDetectionId}`);
//                     // The 'show' endpoint in Laravel often returns the object directly, not nested
//                     savedDetection = getResponse.data;
//                     console.log('Retrieved saved detection with server paths:', {
//                         frame_path: savedDetection.frame_path,
//                         reg_path: savedDetection.reg_path,
//                     });
//                 } catch (getError) {
//                     console.error('Failed to retrieve saved detection after POST, using base64 for notifications:', getError);
//                     savedDetection = detectionPayload; // Fallback
//                 }
//             }
            
//             // Prepare image paths for notification functions
//             const imagePaths = {
//                 frame_path: savedDetection?.frame_path,
//                 reg_path: savedDetection?.reg_path,
//             };

//             // --- 3. Send notifications with the best available image ---
//             await sendNewDetectionNotification(detectionPayload, imagePaths);
            
//             const matchedPet = isActualRegisteredMatch(detectionPayload);
//             if (matchedPet) {
//                 console.log(`MATCH FOUND: Detected ${detectionPayload.pet_name} matches registered ${matchedPet.pet_name}`);
//                 await sendPetMatchNotification(matchedPet.user_id, detectionPayload, matchedPet, imagePaths);
//             }
//         }
//     } catch (postError: any) {
//         console.error('Failed to save detection:', postError.response?.data || postError.message);
//         toast.error("Error Saving Detection", { description: postError.response?.data?.message || "An error occurred." });
//     }
// }

function startMonitoring() {
  fetchPollableCameras().then(() => {
    if (pollableCameras.value.length === 0) {
        toast.info("Monitoring Not Started", { description: "No active camera streams were found." });
        return;
    }
    
    if (POLLING_INTERVAL_MS > 0 && !pollingIntervalId) {
      console.warn(`Polling starting for ${pollableCameras.value.length} camera(s) every ${POLLING_INTERVAL_MS / 1000}s.`);
      pollingIntervalId = window.setInterval(pollExternalAPIAndStore, POLLING_INTERVAL_MS);
      isMonitoringActive.value = true;
      toast.info("Monitoring Started", { description: `Checking for new detections every ${POLLING_INTERVAL_MS / 1000}s.`});
    }
  });
}

function stopMonitoring() {
  if (pollingIntervalId !== undefined) {
    clearInterval(pollingIntervalId);
    pollingIntervalId = undefined;
    isMonitoringActive.value = false;
    console.log('External API polling stopped.');
    toast.info("Monitoring Stopped", { description: "No longer checking for new detections automatically." });
  }
}

function toggleMonitoring() {
  if (isMonitoringActive.value) {
    stopMonitoring();
  } else {
    startMonitoring();
  }
}

async function loadDetectionsFromBackend() {
  try {
    const response = await axios.get<LaravelPagination<any>>('/animal-detections', {
      params: { page: tablePagination.value.pageIndex + 1, per_page: tablePagination.value.pageSize },
    });
    const { data, ...paginationInfo } = response.data;
    detections.value = data.map((item: any) => ({
      ...item,
      id: Number(item.id),
      timestamp: formatBackendTimestamp(item.detected_at || item.created_at),
      frame_base64: formatBase64Image(item.frame_base64),
      reg_base64: formatBase64Image(item.reg_base64),
    }));
    backendPaginationData.value = paginationInfo;
  } catch (error) {
    console.error('Error fetching main list from backend:', error);
    detections.value = [];
    backendPaginationData.value = { ...backendPaginationData.value, total:0, last_page:1, current_page:1 };
    toast.error("Error Loading Detections", { description: "Could not fetch the list of detections." });
  }
}

async function deleteDetection(detectionId: number) {
  console.log(`Attempting to delete detection with ID: ${detectionId}`);
  try {
    await axios.delete(`/animal-detections/${detectionId}`);
    toast.success("Detection Deleted", { description: `Detection ID ${detectionId} has been removed.` });
    await loadDetectionsFromBackend();
  } catch (error: any) {
    console.error(`Error deleting detection ${detectionId}:`, error.response?.data || error.message);
    toast.error("Error Deleting Detection", { description: error.response?.data?.message || "Could not delete the detection." });
  } finally {
    showDeleteConfirmDialog.value = false;
    detectionToDelete.value = null;
  }
}

onMounted(async () => {
  isLoading.value = true;
  await Promise.all([
    loadDetectionsFromBackend(),
    fetchRegisteredPets(),
  ]);
  isLoading.value = false;
  
  startMonitoring();
});

onUnmounted(() => {
  stopMonitoring();
});

const currentCardPage = ref(1);
const cardsPerPage = 8;

const totalCardPages = computed(() => {
  return Math.ceil(filteredDetections.value.length / cardsPerPage);
});

const paginatedCards = computed(() => {
  const start = (currentCardPage.value - 1) * cardsPerPage;
  const end = start + cardsPerPage;
  return filteredDetections.value.slice(start, end);
});

const getPageNumbers = computed(() => {
    const total = totalCardPages.value;
    const current = currentCardPage.value;
    const delta = 2;
    const range = [];
    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
        range.push(i);
    }
    if (current - delta > 2) range.unshift('...');
    if (current + delta < total - 1) range.push('...');
    range.unshift(1);
    if (total > 1) range.push(total);
    return range.filter((item, index, self) => item !== '...' || (item === '...' && self[index-1] !== '...'));
});

const placeholderImage = 'https://placehold.co/600x400/4f6642/FFFFFF/png?text=No+Image';
import { h } from 'vue';
</script>


<template>
  <Head title="Detections" />
  <AppLayout :breadcrumbs="breadcrumbs">
    <div class="container mx-auto py-6 px-4">

      <div class="flex justify-between items-center mb-4">
        <h1 class="text-2xl font-semibold">Detections</h1>
        <Button @click="toggleMonitoring" :variant="isMonitoringActive ? 'destructive' : 'default'">
          <Icon :name="isMonitoringActive ? 'SquareActivity' : 'Play'" class="h-5 w-5 mr-2" />
          {{ isMonitoringActive ? 'Stop Monitoring' : 'Start Monitoring' }}
        </Button>
      </div>

      <div class="flex flex-col gap-6">
        <div v-if="isLoading" class="flex justify-center items-center h-64">
          <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>

        <div v-else>
           <Tabs default-value="Cards">
            <div class="flex flex-wrap items-center justify-between gap-2 mb-4">
              <TabsList>
                <TabsTrigger value="Cards"> <Icon name="Grid2x2" /> </TabsTrigger>
                <TabsTrigger value="Table"> <Icon name="TableProperties" /> </TabsTrigger>
              </TabsList>
              <Input v-model="searchQuery" placeholder="Search detections..." class="w-full sm:w-64" />
            </div>

            <TabsContent value="Cards">
              <div v-if="paginatedCards.length === 0" class="flex justify-center items-center h-64">
                <p class="text-muted-foreground">
                    {{ backendPaginationData.total === 0 ? 'No detections in the system.' : 'No detections found matching your criteria on this page.'}}
                </p>
              </div>
              <div v-else>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <template v-for="animal in paginatedCards" :key="animal.id">
                     <!-- Card for Potential Match -->
                     <Card
                        v-if="animal.frame_base64 && animal.reg_base64 && isActualRegisteredMatch(animal)"
                        class="h-full flex flex-col border-green-500 border-2 relative group"
                      >
                        <CardHeader class="pb-2">
                          <CardTitle class="text-center text-base sm:text-lg text-green-700 flex items-center justify-center gap-2">
                            <Icon name="CheckCircle2" class="h-6 w-6" /> Potential Match!
                          </CardTitle>
                        </CardHeader>
                        <CardContent class="flex-grow flex flex-col gap-2">
                          <div class="text-center">
                            <Badge :variant="animal.has_leash === true ? 'default' : 'destructive'">
                              {{ animal.has_leash === true ? 'Collar/Leashed' : 'No Collar/Leash' }}
                            </Badge>
                          </div>
                          <div v-if="isActualRegisteredMatch(animal)?.user_id" class="text-xs text-center mt-1">
                            Owned by User ID: {{ isActualRegisteredMatch(animal)?.user_id }}
                          </div>
                          <div class="grid grid-cols-2 gap-2 items-start my-1">
                            <div>
                              <p class="text-xs font-semibold text-center mb-1">Detected:</p>
                              <img :src="animal.frame_base64 || placeholderImage" alt="Detected Pet" class="w-full h-auto aspect-square rounded object-contain border p-0.5" />
                            </div>
                            <div>
                              <p class="text-xs font-semibold text-center mb-1">Registered:</p>
                              <img :src="animal.reg_base64 || placeholderImage" alt="Registered Pet" class="w-full h-auto aspect-square rounded object-contain border p-0.5" />
                            </div>
                          </div>
                          <div class="mt-auto pt-2 text-xs border-t">
                            <p v-if="animal.camera_name" class="flex items-center gap-1">
                              <Icon name="video" class="h-3 w-3 text-muted-foreground" />
                              <strong>Camera:</strong> {{ animal.camera_name }}
                            </p>
                            <p v-if="animal.pet_name"><strong>Name:</strong> {{ animal.pet_name }}</p>
                            <p><strong>Type:</strong> {{ animal.pet_type || 'N/A' }}</p>
                            <p><strong>Breed:</strong> {{ animal.breed || 'N/A' }}</p>
                            <p v-if="animal.has_leash === true"><strong>Leash Color:</strong> {{ animal.leash_color || 'Unknown' }}</p>
                            <p><strong>Registered Database Match:</strong> Yes</p>
                            <p v-if="animal.contact_number"><strong>Original Contact (if any):</strong> {{ animal.contact_number }}</p>
                            <p><strong>Time Stored:</strong> {{ animal.timestamp }}</p>
                          </div>
                        </CardContent>
                        <div class="absolute top-2 right-2">
                            <Button @click="confirmDeleteDetection(animal)" variant="destructive" size="icon" class="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Icon name="Trash2" class="h-4 w-4" />
                                <span class="sr-only">Delete Detection</span>
                            </Button>
                        </div>
                      </Card>
                      <!-- Card for Single Detection -->
                      <CardAnimal
                        v-else
                        :id="animal.id" 
                        :title="animal.pet_type ? animal.pet_type.toUpperCase() : 'UNKNOWN TYPE'"
                        :imagelink="animal.frame_base64 || animal.reg_base64 || placeholderImage"
                        :description="`Breed: ${animal.breed || 'N/A'}`"
                        :footerText="animal.camera_name ? `Detected on: ${animal.camera_name}` : ''"
                        :isStray="animal.is_registered === false && !animal.contact_number && !animal.pet_name" 
                        :hasOwnerMatch="!!isActualRegisteredMatch(animal)" 
                        :hasLeash="animal.has_leash"
                        :leashColor="animal.leash_color"
                        :time="animal.timestamp"
                        @delete="() => confirmDeleteDetection(animal)"
                        class="h-auto min-h-[280px] 2xl:min-h-[320px]"
                      >
                        <template #actions>
                           <div class="absolute top-2 right-2 z-10">
                                <Button @click="confirmDeleteDetection(animal)" variant="destructive" size="icon" class="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                    <Icon name="Trash2" class="h-4 w-4" />
                                    <span class="sr-only">Delete Detection</span>
                                </Button>
                            </div>
                        </template>
                      </CardAnimal>
                  </template>
                </div>
                 <div class="flex justify-center mt-6" v-if="totalCardPages > 1">
                  <Pagination v-slot="{ page }" :total="totalCardPages" :sibling-count="1" show-edges :default-page="currentCardPage" @update:page="(newPage) => currentCardPage = newPage">
                    <PaginationContent class="flex gap-1 sm:gap-2">
                      <PaginationPrevious />
                       <template v-for="(item, index) in page.pages">
                        <PaginationItem v-if="item.type === 'page'" :key="index" :value="item.value">
                          <Button class="h-9 w-9 sm:h-10 sm:w-10 text-xs sm:text-sm" :variant="item.value === page.value ? 'default' : 'outline'">
                            {{ item.value }}
                          </Button>
                        </PaginationItem>
                        <PaginationEllipsis v-else :key="item.type" :index="index" class="hidden sm:flex" />
                      </template>
                      <PaginationNext />
                    </PaginationContent>
                  </Pagination>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="Table">
               <Card>
                <CardHeader> <CardTitle>List of Detected Animals</CardTitle> </CardHeader>
                <CardContent>
                  <div v-if="table.getRowModel().rows.length === 0" class="flex justify-center items-center h-32">
                     <p class="text-muted-foreground">
                        {{ backendPaginationData.total === 0 ? 'No detections in the system.' : 'No detections found matching your criteria on this page.'}}
                     </p>
                  </div>
                  <div v-else>
                    <Table>
                      <TableHeader>
                        <TableRow v-for="headerGroup in table.getHeaderGroups()" :key="headerGroup.id">
                          <TableHead v-for="header in headerGroup.headers" :key="header.id" class="text-center" :class="{'cursor-pointer': header.column.getCanSort()}" @click="header.column.getToggleSortingHandler()?.($event)">
                            <div class="flex items-center justify-center space-x-1">
                              <span>{{ header.isPlaceholder ? null : header.column.columnDef.header }}</span>
                              <template v-if="header.column.getIsSorted()">
                                <Icon :name="header.column.getIsSorted() === 'desc' ? 'ArrowDown' : 'ArrowUp'" class="h-4 w-4" />
                              </template>
                            </div>
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        <TableRow v-for="row in table.getRowModel().rows" :key="row.id">
                          <TableCell v-for="cell in row.getVisibleCells()" :key="cell.id" class="text-center">
                             <template v-if="cell.column.id === 'actions'">
                                <component :is="cell.renderValue()"></component>
                            </template>
                            <template v-else>
                                {{ cell.getValue() }}
                            </template>
                          </TableCell>
                        </TableRow>
                      </TableBody>
                      <TableCaption v-if="backendPaginationData.total > 0">
                        Showing {{ backendPaginationData.from || 0 }} to {{ backendPaginationData.to || 0 }} of {{ backendPaginationData.total }} results.
                        Page {{ backendPaginationData.current_page }} of {{ backendPaginationData.last_page }}.
                      </TableCaption>
                    </Table>
                    <div class="flex items-center justify-between space-x-2 py-4" v-if="table.getPageCount() > 1">
                       <span class="text-sm text-muted-foreground"> Page {{ table.getState().pagination.pageIndex + 1 }} of {{ table.getPageCount() }} </span>
                      <div class="flex space-x-2">
                        <Button @click="table.previousPage()" :disabled="!table.getCanPreviousPage()" variant="outline" size="sm"> <Icon name="ChevronLeft" class="h-4 w-4 mr-1" /> Previous </Button>
                        <Button @click="table.nextPage()" :disabled="!table.getCanNextPage()" variant="outline" size="sm"> Next <Icon name="ChevronRight" class="h-4 w-4 ml-1" /> </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>

    <!-- AlertDialog for Delete Confirmation -->
    <AlertDialog :open="showDeleteConfirmDialog" @update:open="showDeleteConfirmDialog = $event">
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure?</AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the detection record
            <span v-if="detectionToDelete">
              for {{ detectionToDelete.pet_name || detectionToDelete.pet_type || `ID ${detectionToDelete.id}` }}
            </span>.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel @click="showDeleteConfirmDialog = false; detectionToDelete = null;">Cancel</AlertDialogCancel>
          <AlertDialogAction @click="detectionToDelete && deleteDetection(detectionToDelete.id)" class="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </AppLayout>
</template>