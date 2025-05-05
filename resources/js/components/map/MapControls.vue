<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { inject, ref, defineEmits, Ref } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger
} from '@/components/ui/collapsible'
import {
  Pencil,
  Trash,
  Pin,
  Video,
  PawPrint,
  MapIcon,
  ZoomIn,
  CircleX,
  ChevronDown,
} from 'lucide-vue-next'
import { Input } from '@/components/ui/input'

const map = inject('map');
const isDrawing = inject('isDrawing') as Ref<boolean>
type EnableDrawingFn = (type: 'polygon' | 'line' | 'point', zoom?: number | null) => boolean
type DrawingFn = () => boolean
  
const enableDrawingMode = inject<EnableDrawingFn>('enableDrawingMode')
const cancelDrawing = inject<DrawingFn>('cancelDrawing')

const isAddPinMode = inject<() => boolean>('isAddPinMode')
const enableAddPinMode = inject<() => boolean>('enableAddPinMode')
const onPinLocationSelected = inject<Ref<(() => void) | null>>('onPinLocationSelected')
const cancelAddPinMode = inject<() => boolean>('cancelAddPinMode')
const saveCameraPin = inject<({name, description, hls, mapId, direction}: {name: string, description:string, hls:string, mapId:number, direction:number}) => Promise<void>>('saveCameraPin')

const isDialogOpen = ref(false)
const isCollapsibleOpen = ref(false)

const isPinDialogOpen = ref(false)
const pinName = ref('')
const pinDetails = ref('')
const pinCameraLink = ref('')
const pinDirection = ref(0)
const compass = ref(null)
let rotating = false

function startRotation(event) {
  rotating = true
  rotateNeedle(event)
}

function stopRotation() {
  rotating = false
}

function rotateNeedle(event) {
  if (!rotating || !compass.value) return

  const rect = compass.value.getBoundingClientRect()
  const centerX = rect.left + rect.width / 2
  const centerY = rect.top + rect.height / 2

  const dx = event.clientX - centerX
  const dy = centerY - event.clientY
  const angle = Math.atan2(dx, dy) * (180 / Math.PI)

  pinDirection.value = (angle + 360) % 360
}
const props = defineProps<{
  selectedMap: any
  selectedMapId: number | undefined;
}>()


const emit = defineEmits<{
  (e: 'drawing', value: boolean): void
}>()

function openDialog() {
  isDialogOpen.value = true
}

function closeDialog() {
  isDialogOpen.value = false
}

if (onPinLocationSelected) {
  onPinLocationSelected.value = () => {
    isPinDialogOpen.value = true
  }
}
function handleEnableDrawing() {
  enableDrawingMode?.('polygon')
  isDrawing.value = true

  emit('drawing', true)
}

function handleCancelDrawing() {
  cancelDrawing?.()
  isDrawing.value = false
  isDialogOpen.value = false
  isCollapsibleOpen.value = true
  emit('drawing', false)
}

function handleAddPin() {
  enableAddPinMode?.();
  
  emit('drawing', true)
}

function handleSavePin(){
  if (props.selectedMapId !== undefined) {
  saveCameraPin?.({
    name: pinName.value,
    description: pinDetails.value,
    hls: pinCameraLink.value,
    mapId: props.selectedMapId,
    direction: pinDirection.value
  })
} else {
  console.error('❌ No selected map ID provided');
}
  isPinDialogOpen.value = false
  emit('drawing', false)
}
function handleCancelPin() {
  cancelAddPinMode?.()
  isDrawing.value = false
  isDialogOpen.value = false
  isCollapsibleOpen.value = true
  emit('drawing', false)
}


</script>

<template>
  <Collapsible v-model:open="isCollapsibleOpen" class="transition-all duration-300">
    <Card class="py-2 rounded-sm">
      <CardHeader class="flex flex-row items-center justify-between space-y-0">
        <CardTitle class="text-lg font-medium">Map Controls</CardTitle>
        <CollapsibleTrigger as-child>
          <Button variant="ghost" size="sm" class="w-9 p-0">
            <ChevronDown :class="isCollapsibleOpen ? 'rotate-180 transition-transform' : 'transition-transform'"
              class="h-4 w-4" />
          </Button>
        </CollapsibleTrigger>
      </CardHeader>

      <CollapsibleContent class="space-y-6 px-6 pb-2">
        <!-- Section: Creating User Area -->
        <div>
          <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Creating User Area</h3>
          <div class="space-y-2">
            <Button @click="openDialog" variant="default" :disabled="isAddPinMode || isDrawing || !props.selectedMap"
              class="w-full flex items-center gap-2 cursor-pointer">
              <Pencil class="w-4 h-4" /> Start Drawing
            </Button>

            <Button v-if="isDrawing" @click="handleCancelDrawing" variant="secondary"
              class="w-full flex items-center gap-2 cursor-pointer">
              <CircleX class="w-4 h-4" /> Cancel Drawing
            </Button>
            <!-- <Button @click="handleDisableDrawing" variant="secondary" class="w-full flex items-center gap-2 cursor-pointer">
              <Trash class="w-4 h-4" /> Clear Drawing
            </Button> -->
          </div>
        </div>

        <!-- Section: Pin Management -->
        <div>
          <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Pin Management</h3>
          <div class="space-y-2">
            <Button :disabled="isAddPinMode || !props.selectedMap || isDrawing" variant="default" class="w-full flex items-center gap-2 cursor-pointer" @click="handleAddPin">
              <Video class="w-4 h-4" /> Add Camera Pin
            </Button>
            <Button v-if="isAddPinMode" @click="handleCancelPin" variant="secondary"
              class="w-full flex items-center gap-2 cursor-pointer">
              <CircleX class="w-4 h-4" /> Cancel Add Pin
            </Button>
            <!-- <Button variant="outline" class="w-full flex items-center gap-2 cursor-pointer">
              <PawPrint class="w-4 h-4" /> Add Animal Pin
            </Button> -->
          </div>
        </div>

        <!-- Section: Map Options -->
        <!-- <div>
          <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Map Options</h3>
          <div class="space-y-2">
            <Button variant="outline" class="w-full flex items-center gap-2 cursor-pointer">
              <MapIcon class="w-4 h-4" /> Create New Map
            </Button>
            <Button variant="outline" class="w-full flex items-center gap-2 cursor-pointer">
              <ZoomIn class="w-4 h-4" /> Zoom to Fit
            </Button>
          </div>
        </div> -->
      </CollapsibleContent>
    </Card>
  </Collapsible>
  <AlertDialog v-model:open="isDialogOpen">
  <AlertDialogContent>
    <AlertDialogHeader>
      <AlertDialogTitle>How to draw an area</AlertDialogTitle>
      <AlertDialogDescription>
        Click on the map to set points. Double-click to finish the shape. You can cancel anytime.
      </AlertDialogDescription>
    </AlertDialogHeader>
    <AlertDialogFooter>
      <AlertDialogCancel @click="closeDialog">Close</AlertDialogCancel>
      <AlertDialogAction @click="() => {
        handleEnableDrawing()
        isDialogOpen = false
      }">Start</AlertDialogAction>
    </AlertDialogFooter>
  </AlertDialogContent>
</AlertDialog>

<AlertDialog v-model:open="isPinDialogOpen">
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>Pin Details</AlertDialogTitle>
        <AlertDialogDescription>
          Fill up the details for the pin below.
        </AlertDialogDescription>
      </AlertDialogHeader>

      <Input v-model="pinName" type="text" placeholder="Pin Name" class="border rounded p-2 mt-2 w-full" />
      <Input v-model="pinDetails" type="text" placeholder="Pin Details" class="border rounded p-2 mt-2 w-full" />
      <Input v-model="pinCameraLink" type="text" placeholder="Pin Camera Link" class="border rounded p-2 mt-2 w-full" />

      <!-- Direction Selector -->
      <div class="mt-4 flex flex-col items-center">
          <label class="mb-2 text-sm font-medium">Camera Direction</label>
          <div
            class="relative w-32 h-32 rounded-full border border-gray-300 bg-gray-50"
            @mousedown="startRotation"
            @mousemove="rotateNeedle"
            @mouseup="stopRotation"
            @mouseleave="stopRotation"
            ref="compass"
          >
            <!-- Custom SVG in the middle -->
            <div class="absolute left-1/2 top-1/2 w-12 h-12 flex items-center justify-center" style="transform: translate(-50%, -50%)">
              <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 512 512" id="cctv">
          <defs>
            <linearGradient id="a" x1="256" x2="256" y1="507.946" y2="4.054" gradientTransform="rotate(45 256 256)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#a6d8f4"></stop>
              <stop offset="1" stop-color="#dff3fd"></stop>
            </linearGradient>
            <linearGradient id="b" x1="256" x2="256" y1="83.078" y2="428.922" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#0068e7"></stop>
              <stop offset="1" stop-color="#26b3e8"></stop>
            </linearGradient>
          </defs>
          <circle cx="256" cy="256" r="251.946" fill="url(#a)" transform="rotate(-45 256 256)"></circle>
          <path fill="url(#b)" d="M402.511,235.596c.992,1.751,1.328,3.876,.769,5.962l-10.505,39.207c-1.13,4.217-5.506,6.743-9.723,5.613l-14.302-3.832 8.497-31.71c.463-1.727 1.52-3.038 3.111-3.855l22.154-11.384Zm-125.661-7.647l87.319,23.397-10.385,38.759c-2.177,8.125-10.606,12.991-18.731,10.814l-72.954-19.548c.134,1.203.206,2.424.206,3.663,0,14.25-9.132,26.366-21.862,30.82v9.476c0,30.086-24.617,54.703-54.702,54.703H116.797v18.416c0,5.852-4.788,10.641-10.641,10.641h-4.39v13.582c0,3.452-2.798,6.25-6.25,6.25s-6.25-2.798-6.25-6.25v-106.845c0-3.452,2.798-6.25,6.25-6.25s6.25,2.798,6.25,6.25v13.582h4.39c5.853,0,10.641,4.789,10.641,10.641v18.416h68.945c18.182,0,33.136-14.954,33.136-33.136v-9.476c-12.73-4.454-21.862-16.569-21.862-30.82,0-7.262,2.372-13.969,6.383-19.392l-64.114-17.179c-16.384-4.39-26.197-21.387-21.807-37.77l.603-2.249 132.368,35.468c1.985,.53 4.003,.041 5.497-1.145l20.905-14.817Zm-35.986,57.085c0-6.188-5.016-11.204-11.204-11.204s-11.204,5.016-11.204,11.204,5.016,11.204,11.204,11.204,11.204-5.016,11.204-11.204Zm89.612-22.704l4.709,1.262c3.33,.89 6.752-1.089 7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642l-4.709-1.262c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642Zm92.259-51.181l-54.955,28.24-90.524-24.256c-1.8-.48-3.708-.127-5.225,.952l-21.178,15.01-129.543-34.711,8.519-31.793c4.39-16.384 21.387-26.197 37.77-21.807l255.135,68.363Zm-225.203-17.378l-48.686-13.045c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642l48.686,13.045c3.33,.89,6.752-1.089,7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642Zm81.774-45.086c0,7.832 6.35,14.182 14.182,14.182s14.182-6.349 14.182-14.182-6.349-14.182-14.182-14.182-14.182,6.349-14.182,14.182Zm-33.378-32.394c2.672,2.178 6.608,1.774 8.789-.902 10.396-12.775 24.16-19.811 38.772-19.811s28.376,7.036 38.765,19.811c1.236,1.517 3.044,2.305 4.854,2.305 1.39,0 2.786-.458 3.939-1.403 2.679-2.178 3.083-6.113 .909-8.793-12.812-15.748-30.03-24.421-48.467-24.421s-35.652,8.672-48.467,24.421c-2.178,2.679-1.777,6.615 .905,8.793Zm71.875,16.86c1.236,1.52 3.033,2.309 4.854,2.309 1.39,0 2.779-.461 3.939-1.403 2.679-2.178 3.083-6.114 .902-8.793-8.967-11.024-21.043-17.094-34.008-17.094s-25.049,6.073-34.015,17.094c-2.178,2.679-1.771,6.614 .902,8.793,2.683,2.178 6.621,1.774 8.793-.905,6.551-8.048,15.187-12.481,24.32-12.481s17.766,4.433,24.314,12.481Z"></path>
        </svg>
            </div>
            
            <!-- Field of View Cone -->
            <div
              class="absolute left-1/2 top-1/2"
              :style="{
                transform: `translate(-50%, -50%) rotate(${pinDirection}deg)`,
                width: '100%',
                height: '100%'
              }"
            >
            <svg
                viewBox="0 0 100 100"
                width="100%"
                height="100%"
                class="absolute top-0 left-0"
              >
                <!-- Field of view cone with rounded arc (60 degree angle) -->
                <path 
                  d="M50,50 L75,8 A 40,40 0 0,0 25,8 L50,50" 
                  fill="rgba(37, 99, 235, 0.3)" 
                  stroke="#2563eb" 
                  stroke-width="1" 
                />
              </svg>
            </div>
          </div>
        </div>
      <AlertDialogFooter>
        <AlertDialogCancel @click="handleCancelPin">Close</AlertDialogCancel>
        <AlertDialogAction @click="() => {
          handleSavePin()
          isPinDialogOpen = false
        }">Save</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>


</template>
