<script setup lang="ts">
import {
  Card,
  CardContent, // Not currently used, can be removed if not planned
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge' // Import Badge
import { defineProps } from 'vue'

defineProps<{
  title: string
  imagelink?: string
  description?: string
  isStray?: boolean
  hasOwnerMatch?: boolean
  // New props for leash information
  hasLeash?: boolean | null // Make it nullable to match parent data
  leashColor?: string | null
}>()

const placeholderImage = 'https://placehold.co/600x400/4f6642/FFFFFF/png?text=No+Image';

</script>

<template>
  <Card class="hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300 flex flex-col text-[14px] 2xl:text-[18px] overflow-hidden py-0">

    <!-- Image flush to top -->
    <div class="relative">
      <img
        :src="imagelink || placeholderImage"
        class="h-[140px] 2xl:h-[200px] w-full object-cover bg-muted"
        alt="Animal"
      />
      <!-- Status Tags -->
      <div class="absolute top-2 left-2 flex flex-wrap gap-1"> {/* Use flex-wrap for smaller screens */}
        <Badge
          v-if="typeof isStray === 'boolean'"
          :variant="isStray ? 'destructive' : 'default'"
          class="text-xs"
        >
          {{ isStray ? 'Stray' : 'Not Stray' }}
        </Badge>
        <Badge
          v-if="typeof hasOwnerMatch === 'boolean'"
          :variant="hasOwnerMatch ? 'info' : 'secondary'"  
          class="text-xs"
        >
          {{ hasOwnerMatch ? 'Owner Matched' : 'No Owner Match' }}
        </Badge>
        <!-- Leash Status Badge - NEW -->
        <Badge
          v-if="typeof hasLeash === 'boolean'"
          :variant="hasLeash ? 'default' : 'destructive'"
          class="text-xs"
        >
          {{ hasLeash ? 'Collar/Leashed' : 'No Collar/Leash' }}
        </Badge>
      </div>
    </div>

    <CardHeader class="px-4 pt-2 pb-1 flex-grow"> {/* Added flex-grow and reduced pb */}
      <CardTitle class="text-center text-base 2xl:text-lg font-bold mb-1 truncate">
        {{ title }}
      </CardTitle>
      <CardDescription class="text-center text-xs 2xl:text-sm text-muted-foreground mb-1">
        {{ description || 'No specific description.' }}
      </CardDescription>
      <!-- Leash Color Display - NEW -->
      <div v-if="hasLeash === true && leashColor" class="text-center text-xs text-muted-foreground">
        Leash: <span class="font-semibold">{{ leashColor }}</span>
      </div>
      <div v-else-if="hasLeash === true" class="text-center text-xs text-muted-foreground">
        Leash: <span class="font-semibold">Color Unknown</span>
      </div>
    </CardHeader>

    <CardFooter class="px-4 py-2 mt-auto justify-center text-xs text-muted-foreground border-t"> {/* Added border-t, py-2 */}
      <!-- You can add more fixed details here, or we can use a slot later -->
      Details
    </CardFooter>
  </Card>
</template>

<style scoped>
/* Ensure card height is managed if content grows */


/* Custom variant for info badge if not in your shadcn theme */
.badge-info {
  @apply bg-blue-500 text-white;
}
</style>