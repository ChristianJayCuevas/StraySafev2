<script setup lang="ts">
import { Button } from '@/components/ui/button'
import { inject } from 'vue'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import {
  Pencil,
  Trash,
  Pin,
  Video,
  PawPrint,
  MapIcon,
  ZoomIn,
  CircleX
} from 'lucide-vue-next'

const map = inject('map');
const enableDrawingMode = inject('enableDrawingMode');
const disableDrawingMode = inject('disableDrawingMode');
const cancelDrawing = inject('cancelDrawing');

function handleEnableDrawing() {
  enableDrawingMode('polygon'); // Enable polygon drawing mode
}

function handleDisableDrawing() {
  disableDrawingMode(); // Disable drawing mode
}

function handleCancelDrawing() {
  cancelDrawing(); // Cancel the current drawing
}
</script>

<template>
  <Card class="transition-all duration-300 card-wrapper">
    <CardHeader>
      <CardTitle>Map Controls</CardTitle>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Section: Creating User Area -->
      <div>
        <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Creating User Area</h3>
        <div class="space-y-2">
          <Button variant="default" class="w-full flex items-center gap-2 cursor-pointer">
            <Pencil class="w-4 h-4" /> Start Drawing
          </Button>
          <Button v-if="enableDrawingMode" variant="outline" class="w-full flex items-center gap-2 cursor-pointer" @click="handleCancelDrawing">
            <CircleX class="w-4 h-4" /> Cancel Drawing
          </Button>
          <Button variant="secondary" class="w-full flex items-center gap-2 cursor-pointer">
            <Trash class="w-4 h-4" /> Clear Drawing
          </Button>
        </div>
      </div>

      <!-- Section: Pin Management -->
      <div>
        <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Pin Management</h3>
        <div class="space-y-2">
          <Button variant="outline" class="w-full flex items-center gap-2 cursor-pointer">
            <Video class="w-4 h-4" /> Add Camera Pin
          </Button>
          <Button variant="outline" class="w-full flex items-center gap-2 cursor-pointer">
            <PawPrint class="w-4 h-4" /> Add Animal Pin
          </Button>
        </div>
      </div>

      <!-- Section: Map Options -->
      <div>
        <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Map Options</h3>
        <div class="space-y-2">
          <Button variant="outline" class="w-full flex items-center gap-2 cursor-pointer">
            <MapIcon class="w-4 h-4" /> Create New Map
          </Button>
          <Button variant="outline" class="w-full flex items-center gap-2 cursor-pointer">
            <ZoomIn class="w-4 h-4" /> Zoom to Fit
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
<style scoped>
.card-wrapper {
  width: 100%;
  height: 465px;
  transition: all 0.3s ease;
}
@media screen and (min-width: 1910px) {
  .card-wrapper {
    height: 635px;
  }
}
</style>