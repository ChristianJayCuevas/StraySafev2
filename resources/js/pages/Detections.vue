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
  frame_path?: string | null; // Path to the frame image in your storage
  reg_path?: string | null; // Path to the registered image in your storage
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
    // Define a type for the expected backend response structure
    interface RegisteredPetsApiResponse {
      status: string;
      data: RegisteredPet[]; // The array of pets
    }

    // Use this type with axios.get
    const response = await axios.get<RegisteredPetsApiResponse>('/api/mobileregisteredanimals'); // Adjust endpoint if needed

    if (response.data && response.data.status === 'success' && Array.isArray(response.data.data)) {
      registeredPets.value = response.data.data; // Access the nested 'data' array
      console.log('Registered pets loaded:', registeredPets.value.length); // Now this will be correct
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
  // const detectedBreedLower = detectedAnimal.breed.toLowerCase().trim();


  return registeredPets.value.find(regPet =>
    regPet.pet_name.toLowerCase().trim() === detectedNameLower
    // regPet.breed.toLowerCase().trim() === detectedBreedLower
  );
}
// --- Notification Sending ---
async function sendNewDetectionNotification(detectedAnimal: Detection) {
  const NOTIFICATION_URL = 'https://straysafe.me/send-notification';

  // --- Notification Limiting Logic for General Detections ---
  // We use a key based on the camera and track ID to avoid spamming for the same animal.
  const detectionKey = `${detectedAnimal.camera_name}-${detectedAnimal.track_id}`;
  if (notifiedMatches.value.has(detectionKey)) {
    console.log(`General notification for detectionKey ${detectionKey} already sent. Skipping.`);
    return;
  }

  // --- Build a generic notification body ---
  let bodyLines = [
    `A ${detectedAnimal.pet_type || 'new animal'} was detected.`,
    `Location: Near Camera "${detectedAnimal.camera_name || 'unnamed'}"`,
    `Latitude: ${NOTIFICATION_LATITUDE}, Longitude: ${NOTIFICATION_LONGITUDE}`,
  ];

  if (detectedAnimal.breed) {
    bodyLines.push(`Detected Breed: ${detectedAnimal.breed}`);
  }
  if (detectedAnimal.has_leash) {
    bodyLines.push(`Collar/Leash: Yes (Color: ${detectedAnimal.leash_color || 'Unknown'})`);
  } else {
    bodyLines.push(`Collar/Leash: No`);
  }
  
  const bodyMessage = bodyLines.join('\n');

  const payload = {
    user_id: 3, // Send to a default admin user ID
    title: `New Animal Detected: ${detectedAnimal.pet_type?.toUpperCase() || 'Unknown'}`,
    body: bodyMessage,
    action: '/mobilemap', // Or a different action URL for general alerts
    image: detectedAnimal.frame_path || 'https://straysafe.me/images/default-pet-notification.png',
  };

  console.log('Sending generic detection notification:', payload);

  try {
    await axios.post(NOTIFICATION_URL, payload);
    toast.success("New Detection Alert Sent!", {
      description: `Notified admin about the new ${detectedAnimal.pet_type}.`
    });
    // Add the key to the set to prevent re-notifying
    notifiedMatches.value.add(detectionKey);
  } catch (error: any) {
    console.error('Failed to send generic detection notification:', error.response?.data || error.message);
    toast.error("Generic Notification Failed", {
      description: `Could not send alert for the new detection.`
    });
  }
}
async function sendPetMatchNotification(userId: number, detectedAnimal: Detection, matchedRegisteredPet: RegisteredPet) {
  const NOTIFICATION_URL = 'https://straysafe.me/send-notification';

  // --- Notification Limiting Logic (No changes needed here) ---
  const matchKey = `${detectedAnimal.camera_name}-${detectedAnimal.track_id}-${matchedRegisteredPet.id}`;
  if (notifiedMatches.value.has(matchKey)) {
    console.log(`Notification for matchKey ${matchKey} already sent this session. Skipping.`);
    return;
  }

  // --- MODIFIED: Build a more detailed notification body ---
  let bodyLines = [
    `A pet similar to your registered pet, ${matchedRegisteredPet.pet_name}, was detected.`,
    `Location: Near Camera "${detectedAnimal.camera_name || 'unnamed'}"`,
    `Latitude: ${NOTIFICATION_LATITUDE}, Longitude: ${NOTIFICATION_LONGITUDE}`,
  ];
  
  // Add details about the detected animal if they exist
  if (detectedAnimal.breed) {
    bodyLines.push(`Detected Breed: ${detectedAnimal.breed}`);
  }
  if (detectedAnimal.has_leash) {
    bodyLines.push(`Detected Collar/Leash: Yes (Color: ${detectedAnimal.leash_color || 'Unknown'})`);
  } else {
    bodyLines.push(`Detected Collar/Leash: No`);
  }

  const bodyMessage = bodyLines.join('\n');
  
  // --- Determine the best image to use (No changes needed here) ---
  let notificationImage = detectedAnimal.frame_path || 
                         detectedAnimal.reg_path || 
                         'https://straysafe.me/images/default-pet-notification.png';

  // --- MODIFIED: Add latitude and longitude to the payload ---
  const payload = {
    user_id: userId, // Use the correct user_id from the matched pet
    title: `Potential Match Found for Your Pet: ${matchedRegisteredPet.pet_name}!`,
    body: bodyMessage,
    action: '/mobilemap',
    image: notificationImage,
  };

  console.log('Sending notification payload:', payload);

  try {
    const response = await axios.post(NOTIFICATION_URL, payload);
    console.log('Notification sent successfully:', response.data);
    toast.success("Match Notification Sent!", { 
      description: `Owner of ${matchedRegisteredPet.pet_name} has been notified.` 
    });
    // Add the key to the set to prevent re-notifying for this specific detection
    notifiedMatches.value.add(matchKey);
  } catch (error: any) {
    console.error('Failed to send notification:', error.response?.data || error.message);
    toast.error("Notification Failed", { 
      description: `Could not notify owner of ${matchedRegisteredPet.pet_name}` 
    });
  }
}
// async function sendPetMatchNotification(userId: number, detectedAnimal: Detection, matchedRegisteredPet: RegisteredPet, savedDetectionPaths?: { frame_path?: string, reg_path?: string }) {
//   const NOTIFICATION_URL = 'https://straysafe.me/send-notification';

//   // ---- START Notification Limiting Logic ----
//   const matchKey = `${detectedAnimal.external_api_id || detectedAnimal.pet_name}-${matchedRegisteredPet.id}`;

//   if (notifiedMatches.value.has(matchKey)) {
//     console.log(`Notification for matchKey ${matchKey} already sent this session. Skipping.`);
//     return;
//   }
//   // ---- END Notification Limiting Logic ----

//   let bodyMessage = `A pet matching the description of your registered pet, ${matchedRegisteredPet.pet_name} (${matchedRegisteredPet.breed}), has been detected.\n`;
//   // ... (rest of bodyMessage construction) ...

//   // Determine the best image to use for the notification
//   let notificationImage = savedDetectionPaths?.frame_path || 
//                          savedDetectionPaths?.reg_path || 
//                          detectedAnimal.frame_base64 || 
//                          detectedAnimal.reg_base64 || 
//                          'https://straysafe.me/images/default-pet-notification.png';

//   const payload = {
//     user_id: 1, // Use the actual user_id parameter
//     title: `Potential Match Found for Your Pet: ${matchedRegisteredPet.pet_name}!`,
//     body: bodyMessage,
//     action: '/mobilemap',
//     image: notificationImage,
//   };

//   console.log('Sending notification payload:', payload);
//   console.log('Using image:', notificationImage);

//   try {
//     const response = await axios.post(NOTIFICATION_URL, payload);
//     console.log('Notification sent successfully:', response.data);
//     toast.success("Match Notification Sent!", { 
//       description: `Owner of ${matchedRegisteredPet.pet_name} has been notified.` 
//     });
//     notifiedMatches.value.add(matchKey);
//   } catch (error: any) {
//     console.error('Failed to send notification:', error.response?.data || error.message);
//     toast.error("Notification Failed", { 
//       description: `Could not notify owner of ${matchedRegisteredPet.pet_name}` 
//     });
//   }
// }


// --- Enhanced Polling Logic ---
// In <script setup>

async function pollExternalAPIAndStore() {
  if (isPolling.value) return; // Prevent multiple polls from running at once
  if (isLoadingRegisteredPets.value) {
    console.log('Polling paused: Registered pets data is still loading.');
    return;
  }
  // If there are no active cameras to poll, don't do anything.
  if (pollableCameras.value.length === 0) {
    console.log("Polling skipped: No active cameras detected.");
    return;
  }
  
  isPolling.value = true;

  console.log(`Polling ${pollableCameras.value.length} active camera(s)...`);

  // Loop through each active camera and check for new images
  for (const camera of pollableCameras.value) {
    const cameraFolderName = camera.name;
    const API_URL = `${STREAM_CONTROL_API_BASE}/check_new_image_from_camera?camera_folder=${cameraFolderName}`;

    try {
      const response = await axios.get<Detection>(API_URL);

      // The rest of the logic is the same, but it now runs for EACH camera
      const detectedAnimalData = response.data;
      
      // Check for a valid detection object (not an empty message)
      if (detectedAnimalData && detectedAnimalData.pet_name) {
        console.log(`[${cameraFolderName}] New detection received:`, detectedAnimalData);

        // --- All your existing logic for saving to backend and sending notifications goes here ---
        // I will copy it over but no changes are needed inside this block.
        const detectionPayload = {
          external_api_id: String(detectedAnimalData.pet_name),
          external_api_type: detectedAnimalData.pet_type,
          breed: detectedAnimalData.breed || null,
          contact_number: detectedAnimalData.contact_number === 'none' ? null : (detectedAnimalData.contact_number || null),
          frame_base64: detectedAnimalData.detected_image_base64 || detectedAnimalData.frame_base64 || null,
          reg_base64: detectedAnimalData.registered_image_base64 || detectedAnimalData.reg_base64 || null,
          has_leash: typeof detectedAnimalData.has_leash === 'boolean' ? detectedAnimalData.has_leash : null,
          is_registered: typeof detectedAnimalData.is_registered === 'boolean' ? detectedAnimalData.is_registered : null,
          leash_color: detectedAnimalData.leash_color === 'none' ? null : (detectedAnimalData.leash_color || null),
          pet_name: detectedAnimalData.pet_name === 'none' ? null : (detectedAnimalData.pet_name || null),
          pet_type: detectedAnimalData.pet_type,
          // --- IMPORTANT: Add the camera name to the payload ---
          camera_name: cameraFolderName, 
          rtsp_url: detectedAnimalData.rtsp_url || camera.source, // Use the source as a fallback
          track_id: detectedAnimalData.track_id || null,
          stable_class: detectedAnimalData.stable_class || null,
          detection_timestamp: detectedAnimalData.timestamp || null,
          similarity_score: typeof detectedAnimalData.similarity_score === 'number' ? detectedAnimalData.similarity_score : null,
        };

        // ... (The rest of your saving and notification logic remains unchanged)
        // This is just a placeholder to show where it goes.
        await handleNewDetection(detectionPayload); 
      }
    } catch (error: any) {
      if (error.response && error.response.status === 200 && error.response.data.message) {
        // This is the expected "No new match" response, not an error.
        // console.log(`[${cameraFolderName}] No new matches.`);
      } else {
        console.warn(`[${cameraFolderName}] Error polling:`, error.message);
      }
    }
  } // End of for...of loop

  isPolling.value = false;
}

// Helper function to contain the saving/notification logic to keep poll function cleaner
async function handleNewDetection(detectionPayload: Detection) {
    try {
        // --- 1. Save the detection to your Laravel backend ---
        const backendResponse = await axios.post('/animal-detections', detectionPayload);
        
        if (backendResponse.status === 201 || backendResponse.status === 200) {
            toast.success("New Detection Saved!", { 
              description: `From camera: ${detectionPayload.camera_name}` 
            });
            // Refresh the UI list with the new data
            await loadDetectionsFromBackend();

            // --- 2. Send the generic "New Detection" notification to admins ---
            // We use the full payload which now includes the camera_name etc.
            await sendNewDetectionNotification(detectionPayload);
            
            // --- 3. Check for a match with a registered pet ---
            const matchedPet = isActualRegisteredMatch(detectionPayload);
            if (matchedPet) {
                // If a match is found, send a specific notification to the owner
                console.log(`MATCH FOUND: Detected ${detectionPayload.pet_name} matches registered ${matchedPet.pet_name}`);
                await sendPetMatchNotification(matchedPet.user_id, detectionPayload, matchedPet);
            }
        }
    } catch (postError: any) {
        console.error('Failed to save detection:', postError.response?.data || postError.message);
        toast.error("Error Saving Detection", { description: postError.response?.data?.message });
    }
}

function startMonitoring() {
  // First, fetch the list of which cameras are actually running
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
      external_api_id: item.external_api_id || null,
      external_api_type: item.external_api_type || null,
      api_id: item.api_id || null,
      api_type: item.api_type || null,
      timestamp: formatBackendTimestamp(item.detected_at),
      external_data_timestamp: formatBackendTimestamp(item.external_data_updated_at),
      frame_base64: formatBase64Image(item.frame_base64, item.pet_type === 'dog' ? 'jpeg' : 'png'),
      reg_base64: formatBase64Image(item.reg_base64, item.pet_type === 'dog' ? 'jpeg' : 'png'),
      // NEW FIELDS: Add the meta data fields
      rtsp_url: item.rtsp_url || null,
      track_id: item.track_id || null,
      stable_class: item.stable_class || null,
      detection_timestamp: item.detection_timestamp ? formatBackendTimestamp(item.detection_timestamp) : null,
      similarity_score: item.similarity_score ? Number(item.similarity_score) : null,
      frame_path: item.frame_path || null,
      reg_path: item.reg_path || null,
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
  
  // Automatically start monitoring on page load
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

       <!-- Polling Warning Banner -->
      <!-- <div v-if="isMonitoringActive && POLLING_INTERVAL_MS > 0 && POLLING_INTERVAL_MS <= 5000"
           class="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm" role="alert">
        <p>
          <Icon name="AlertTriangle" class="inline h-5 w-5 mr-2" />
          <strong class="font-semibold">Aggressive Polling Active:</strong> External API is being checked every {{ POLLING_INTERVAL_MS / 1000 }} second(s).
        </p>
      </div> -->

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
                          <!-- ... existing content for matched card ... -->
                          <div class="text-center">
                            <Badge :variant="animal.has_leash === true ? 'default' : 'destructive'">
                              {{ animal.has_leash === true ? 'Collar/Leashed' : 'No Collar/Leash' }}
                            </Badge>
                          </div>
                           <!-- Display owner info if available from the match -->
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
                        <!-- Delete Button Overlay -->
                        <div class="absolute top-2 right-2">
                            <Button @click="confirmDeleteDetection(animal)" variant="destructive" size="icon" class="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity">
                                <Icon name="Trash2" class="h-4 w-4" />
                                <span class="sr-only">Delete Detection</span>
                            </Button>
                        </div>
                      </Card>
                      <!-- Card for Single Detection (Not a confirmed registered match OR missing an image) -->
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
                        <!-- Delete Button Overlay for CardAnimal -->
                        <template #actions> <!-- Or add directly if CardAnimal doesn't have a slot -->
                           <div class="absolute top-2 right-2 z-10"> <!-- Ensure z-index if needed -->
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
                            <!-- Custom rendering for action buttons in table -->
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