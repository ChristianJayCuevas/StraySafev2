<script setup lang="ts">
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { defineProps } from 'vue'

defineProps<{
  title: string
  imagelink?: string
  description?: string
  isStray?: boolean
  hasOwnerMatch?: boolean
  hasLeash?: boolean | null
  leashColor?: string | null
}>()

const placeholderImage = 'https://placehold.co/600x400/4f6642/FFFFFF/png?text=No+Image'
</script>

<template>
  <Card class="hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300 flex flex-col text-[14px] 2xl:text-[18px] overflow-hidden py-0 rounded-xl shadow-sm">
    
    <!-- Image Section -->
    <div class="relative">
      <img
        :src="imagelink || placeholderImage"
        class="h-[140px] 2xl:h-[200px] w-full object-cover bg-muted"
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
      <CardDescription class="text-md 2xl:text-sm text-muted-foreground mb-1">
        {{ description || 'No specific description.' }}
      </CardDescription>

      <!-- Leash Color -->
      <div
        v-if="hasLeash === true"
        class="text-md text-muted-foreground"
      >
        Leash: <span class="font-semibold">{{ leashColor || 'Color Unknown' }}</span>
      </div>
    </CardHeader>

    <!-- Footer -->
    <!-- <CardFooter class="px-4 py-2 mt-auto justify-center text-xs text-muted-foreground border-t">
      Detection Summary
    </CardFooter> -->
  </Card>
</template>
