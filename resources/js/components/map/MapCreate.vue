<script setup lang="ts">
import { ref, onMounted, inject, Ref } from 'vue'
import { useMapCreate } from '@/composables/useMapCreate'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
  AlertDialogHeader,
  AlertDialogFooter,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { toast } from 'vue-sonner'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
const name = ref('')
const isPublic = ref(false)
const isDialogOpen = ref(false)
const isSelectAreasOpen = ref(false)
const {
  loadUserMaps,
  createMap,
  allMaps,
  personalMap,
  error,
  isLoading
} = useMapCreate()

onMounted(() => {
  loadUserMaps()
})
const areas = inject('areas') as Ref<any[]>
const fetchUserAreas = inject('fetchUserAreas') as Ref<any[]>
const handleCreate = async () => {
  if (personalMap.value) {
    toast.warning('Please delete or reuse your existing one.')
    return
  }

  const newMap = await createMap({ name: name.value, is_public: isPublic.value })
  if (newMap) {
    isDialogOpen.value = false
    name.value = ''
    isPublic.value = false
    toast.success(`${newMap.name} is now your active map.`)
  }
}
</script>

<template>

    <AlertDialog v-model:open="isDialogOpen">
      <AlertDialogTrigger as-child>
        <Button variant="secondary">Create Map</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Select or Create a Map</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a name to create a new map. If a personal map exists, you'll be redirected to it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="space-y-3">
          <Input
            v-model="name"
            type="text"
            placeholder="Map name"
            required
          />
          <div class="items-top flex gap-x-2">
            <Checkbox v-model="isPublic" id="PublicMap" class="border-black dark:border-white ml-2" />
            <div class="grid gap-1.5 leading-none">
            <label for="PublicMap" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Make this Map public
            </label>
            <p class="text-xs text-muted-foreground">
              You agree to make this Map public and other users can see it.
            </p>
            </div>
          </div>
        </div>
        <div v-if="allMaps.length" class="my-4 space-y-2 max-h-[200px] overflow-y-auto">
        <p class="font-semibold text-sm text-muted-foreground mb-1">Your Maps:</p>
        <ul class="space-y-1">
            <li
            v-for="map in allMaps"
            :key="map.id"
            class="flex justify-between items-center border px-3 py-2 rounded hover:bg-muted cursor-pointer transition"
            >
            <span class="font-medium">{{ map.name }}</span>
            <span class="text-xs text-muted-foreground">{{ map.is_public ? 'Public' : 'Private' }}</span>
            </li>
        </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction :disabled="isLoading" @click="handleCreate">
            {{ isLoading ? 'Creating...' : 'Create' }}
          </AlertDialogAction>
        </AlertDialogFooter>
        <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
      </AlertDialogContent>
    </AlertDialog>


    <AlertDialog v-model:open="isSelectAreasOpen">
      <AlertDialogTrigger as-child>
        <Button variant="secondary">Select Area</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Select Existing Areas</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a name to create a new map. If a personal map exists, you'll be redirected to it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="space-y-3">
          <Input
            v-model="name"
            type="text"
            placeholder="Map name"
            required
          />
          <div class="items-top flex gap-x-2">
            <Checkbox v-model="isPublic" id="PublicMap" class="border-black dark:border-white ml-2" />
            <div class="grid gap-1.5 leading-none">
            <label for="PublicMap" class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
              Make this Map public
            </label>
            <p class="text-xs text-muted-foreground">
              You agree to make this Map public and other users can see it.
            </p>
            </div>
          </div>
        </div>
        <div v-if="allMaps.length" class="my-4 space-y-2 max-h-[200px] overflow-y-auto">
        <p class="font-semibold text-sm text-muted-foreground mb-1">Your Maps:</p>
        <ul class="space-y-1">
            <li
            v-for="map in allMaps"
            :key="map.id"
            class="flex justify-between items-center border px-3 py-2 rounded hover:bg-muted cursor-pointer transition"
            >
            <span class="font-medium">{{ map.name }}</span>
            <span class="text-xs text-muted-foreground">{{ map.is_public ? 'Public' : 'Private' }}</span>
            </li>
        </ul>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction :disabled="isLoading" @click="handleCreate">
            {{ isLoading ? 'Creating...' : 'Create' }}
          </AlertDialogAction>
        </AlertDialogFooter>
        <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
      </AlertDialogContent>
    </AlertDialog>

</template>
