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

function openPinDialog()
{
  isPinDialogOpen.value = true
}

function closePinDialog()
{
  isPinDialogOpen.value = false
}

if (onPinLocationSelected) {
  onPinLocationSelected.value = () => {
    isPinDialogOpen.value = true
  }
}
function handleEnableDrawing() {
  enableDrawingMode?.('polygon')
  isDrawing.value = true
  isCollapsibleOpen.value = false
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
  isCollapsibleOpen.value = false
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
            <Button @click="openDialog" variant="default" :disabled="isDrawing || !props.selectedMap"
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
        <label class="mb-2 text-sm font-medium">Camera Direction ({{ pinDirection }}°)</label>
        <div
          class="relative w-32 h-32 rounded-full border border-gray-300"
          @mousedown="startRotation"
          @mousemove="rotateNeedle"
          @mouseup="stopRotation"
          @mouseleave="stopRotation"
          ref="compass"
        >
          <div
            class="absolute left-1/2 top-1/2 w-1 h-16 bg-blue-600 origin-bottom rounded"
            :style="{ transform: `translate(-50%, -100%) rotate(${pinDirection}deg)` }"
          ></div>
        </div>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel @click="closePinDialog">Close</AlertDialogCancel>
        <AlertDialogAction @click="() => {
          handleSavePin()
          isPinDialogOpen = false
        }">Save</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>


</template>
