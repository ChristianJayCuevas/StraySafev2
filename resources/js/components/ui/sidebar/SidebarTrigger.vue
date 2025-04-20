<script setup lang="ts">
import type { HTMLAttributes } from 'vue'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Menu } from 'lucide-vue-next'
import { useSidebar } from './utils'

const props = defineProps<{
  class?: HTMLAttributes['class']
}>()

const { toggleSidebar } = useSidebar()
</script>

<template>
  <Button
    data-sidebar="trigger"
    data-slot="sidebar-trigger"
    variant="ghost"
    size="lg"
    :class="cn('h-7 w-7', props.class, 'cursor-pointer')"
    @click="toggleSidebar"
  >
    <Menu class="size-7"/>
    <span class="sr-only">Toggle Sidebar</span>
  </Button>
</template>
