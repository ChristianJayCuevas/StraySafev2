<script setup lang="ts">
import { Button } from '@/components/ui/button'
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
  ZoomIn
} from 'lucide-vue-next'
</script>

<template>
  <Card class="transition-all duration-300">
    <CardHeader>
      <CardTitle>Map Controls</CardTitle>
    </CardHeader>

    <CardContent class="space-y-6">
      <!-- Section: Creating User Area -->
      <div>
        <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Creating User Area</h3>
        <div class="space-y-2">
          <Button variant="default" class="w-full flex items-center gap-2">
            <Pencil class="w-4 h-4" /> Start Drawing
          </Button>
          <Button variant="secondary" class="w-full flex items-center gap-2">
            <Trash class="w-4 h-4" /> Clear Drawing
          </Button>
        </div>
      </div>

      <!-- Section: Pin Management -->
      <div>
        <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Pin Management</h3>
        <div class="space-y-2">
          <Button variant="outline" class="w-full flex items-center gap-2">
            <Video class="w-4 h-4" /> Add Camera Pin
          </Button>
          <Button variant="outline" class="w-full flex items-center gap-2">
            <PawPrint class="w-4 h-4" /> Add Animal Pin
          </Button>
        </div>
      </div>

      <!-- Section: Map Options -->
      <div>
        <h3 class="text-sm font-semibold mb-2 text-muted-foreground">Map Options</h3>
        <div class="space-y-2">
          <Button variant="ghost" class="w-full flex items-center gap-2">
            <MapIcon class="w-4 h-4" /> Create New Map
          </Button>
          <Button variant="ghost" class="w-full flex items-center gap-2">
            <ZoomIn class="w-4 h-4" /> Zoom to Fit
          </Button>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
