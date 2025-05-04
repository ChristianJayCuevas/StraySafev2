<script setup lang="ts">
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

import { defineProps } from 'vue'

defineProps<{
  title: string
  imagelink?: string
  description?: string
  isStray?: boolean
  hasOwnerMatch?: boolean
}>()
</script>

<template>
  <Card class="hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300 h-[280px] 2xl:h-[320px] text-[14px] 2xl:text-[18px] overflow-hidden py-0">

    <!-- Image flush to top -->
    <div class="relative">
      <img
        :src="imagelink"
        class="h-[140px] 2xl:h-[200px] w-full object-cover bg-black dark:bg-white"
        alt="Animal"
      />
      <!-- Status Tags -->
      <div class="absolute top-2 left-2 flex gap-2">
        <span
          :class="[
            'px-2 py-1 text-xs rounded-full font-semibold',
            isStray ? 'bg-red-500 text-white' : 'bg-green-500 text-white'
          ]"
        >
          {{ isStray ? 'Stray' : 'Not Stray' }}
        </span>
        <span
          :class="[
            'px-2 py-1 text-xs rounded-full font-semibold',
            hasOwnerMatch ? 'bg-blue-500 text-white' : 'bg-gray-500 text-white'
          ]"
        >
          {{ hasOwnerMatch ? 'Owner Found' : 'No Owner Found' }}
        </span>
      </div>
    </div>

    <CardHeader class="px-4 pt-2">
      <CardTitle class="text-center text-lg font-bold mb-1">
        {{ title }}
      </CardTitle>
      <CardDescription class="text-center text-sm text-gray-600 dark:text-gray-300">
        {{ description || 'No description provided.' }}
      </CardDescription>
    </CardHeader>

    <CardFooter class="px-4 mb-4 mt-auto justify-center text-xs text-gray-400 dark:text-gray-500">
      Detection Summary
    </CardFooter>
  </Card>
</template>

<style scoped>
</style>
