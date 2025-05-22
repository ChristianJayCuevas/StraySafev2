<script setup lang="ts">
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button' // Import Button
import Icon from '@/components/Icon.vue'       // Import Icon
import { defineProps, defineEmits } from 'vue'    // Import defineEmits

const props = defineProps<{
  id: number | string // Add id to identify the animal for deletion
  title: string
  imagelink?: string
  description?: string
  isStray?: boolean
  hasOwnerMatch?: boolean
  hasLeash?: boolean | null
  leashColor?: string | null
  time?: string
}>()

const emit = defineEmits(['delete']) // Define a delete event

const placeholderImage = 'https://placehold.co/600x400/4f6642/FFFFFF/png?text=No+Image'

function handleDelete() {
  emit('delete', props.id) // Emit the id of the animal to be deleted
}
</script>

<template>
  <Card class="hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300 flex flex-col text-[14px] 2xl:text-[18px] overflow-hidden py-0 rounded-xl shadow-sm relative group"> {/* Added relative group */}

    <!-- Delete Button Overlay -->
    <div class="absolute top-2 right-2 z-10"> {/* Ensure z-index if needed */}
        <Button @click="handleDelete" variant="destructive" size="icon" class="h-8 w-8 opacity-50 group-hover:opacity-100 transition-opacity">
            <Icon name="Trash2" class="h-4 w-4" />
            <span class="sr-only">Delete Detection</span>
        </Button>
    </div>

    <!-- Image Section -->
    <div class="relative">
      <img
        :src="imagelink || placeholderImage"
        class="h-[300px] 2xl:h-[300px] w-full object-cover bg-muted"
        alt="Animal"
      />
      <!-- Status Badges -->
      <div class="absolute top-2 left-2 flex flex-wrap gap-1">
        <Badge
          v-if="typeof isStray === 'boolean'"
          :class="isStray ? 'bg-red-500 text-white' : 'bg-green-500 text-white'"
          class="text-xs px-2 py-0.5 rounded-full shadow-sm"
        >
          {{ isStray ? 'Stray' : 'Not Stray' }}
        </Badge>
        <Badge
          v-if="typeof hasOwnerMatch === 'boolean'"
          :class="hasOwnerMatch ? 'bg-blue-500 text-white' : 'bg-gray-400 text-white'"
          class="text-xs px-2 py-0.5 rounded-full shadow-sm"
        >
          {{ hasOwnerMatch ? 'Owner Matched' : 'No Owner Match' }}
        </Badge>
        <Badge
          v-if="typeof hasLeash === 'boolean'"
          :class="hasLeash ? 'bg-blue-500 text-black' : 'bg-yellow-600 text-white'"
          class="text-xs px-2 py-0.5 rounded-full shadow-sm"
        >
          {{ hasLeash ? 'Collar/Leashed' : 'No Collar/Leash' }}
        </Badge>
      </div>
    </div>

    <!-- Card Info -->
    <CardHeader class="px-4 pt-2 pb-1 flex-grow text-center">
      <CardTitle class="text-base 2xl:text-lg font-bold mb-1 truncate">
        {{ title }}
      </CardTitle>
      <CardDescription class="text-lg text-muted-foreground">
        {{ description || 'No specific description.' }}
      </CardDescription>
      <div
        v-if="hasLeash === true"
        class="text-lg text-muted-foreground"
      >
        Leash: <span class="font-semibold">{{ leashColor || 'Color Unknown' }}</span>
      </div>
    </CardHeader>

    <!-- Footer -->
   <CardFooter class="px-4 py-2 mt-auto justify-center text-md text-muted-foreground border-t">
      Time: <span class="font-semibold">{{ time }}</span>
    </CardFooter>
  </Card>
</template>
