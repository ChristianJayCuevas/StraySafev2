<script setup lang="ts">
import { SidebarGroup, SidebarGroupLabel, SidebarGroupAction, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem, type SharedData } from '@/types';
import { Link, usePage } from '@inertiajs/vue3';
import { computed } from 'vue';

const props = defineProps<{
  items: NavItem[];
}>()

const groupedItems = computed(() => {
  const groups: Record<string, NavItem[]> = {}
  for (const item of props.items) {
    const group = item.group || 'General'
    if (item.hidden) {
      continue
    }
    if (!groups[group]) {
      groups[group] = []
    }
    groups[group].push(item)
  }
  return groups
})

const page = usePage<SharedData>();

</script>
<template>
    <SidebarGroup v-for="(groupItems, groupName) in groupedItems" :key="groupName" class="px-2 py-0">
      <SidebarGroupLabel>{{ groupName }}</SidebarGroupLabel>

      <SidebarMenu>
        <SidebarMenuItem v-for="item in groupItems" :key="item.title" class="mt-1">
          <SidebarMenuButton
            as-child
            :is-active="item.href === page.url"
            :tooltip="item.title"
          >
            <Link :href="item.href">
              <component :is="item.icon"/>
              <span class="font-semibold">{{ item.title }}</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  </template>