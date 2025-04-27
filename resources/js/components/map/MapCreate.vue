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
import { areaFactors } from '@turf/turf'

const name = ref('')
const isPublic = ref(false)
const isDialogOpen = ref(false)
const isSelectAreasOpen = ref(false)
const props = defineProps<{
  selectedMap: any;
}>()

const {
  deleteMap,
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

const deleteUserArea = inject<({featureId}:{featureId:string}) => Promise<void>>('deleteUserArea')
const fetchUserAreas = inject<({mapId}:{mapId: number}) => Promise<void>>('fetchUserAreas')
const userAreasInfo = inject('areas') as Ref<any>

console.log("All maps", allMaps)
console.log("Areas Info", userAreasInfo)
const handleCreate = async () => {
  if (personalMap.value) {
    toast.warning('Please delete or reuse your existing one.')
    return
  }

  const newMap = await createMap({ name: name.value, is_public: isPublic.value })
  if (newMap) {
    await loadUserMaps() // 🛠 Reload maps after creation
    isDialogOpen.value = false
    name.value = ''
    isPublic.value = false
    toast.success(`${newMap.name} is now your active map.`)
  }
}

const handleDelete = async () => {
  const deleteSelectedMap = await deleteMap({ mapId: props.selectedMap })

  if (deleteSelectedMap) {
    toast.success("Successfully deleted the Map")
    isDialogOpen.value = false
  }
}

const handleAreaDelete = async({featureId}:{featureId:string}) => {
  const deleteSelectedArea = await deleteUserArea?.({ featureId: featureId})

  if (deleteSelectedArea)
  {
    await fetchUserAreas?.({mapId: props.selectedMap})
    toast.success("Successfully deleted the Area")
    isSelectAreasOpen.value = false
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
        <Input v-model="name" type="text" placeholder="Map name" required />
        <div class="items-top flex gap-x-2">
          <Checkbox v-model="isPublic" id="PublicMap" class="border-black dark:border-white ml-2" />
          <div class="grid gap-1.5 leading-none">
            <label for="PublicMap"
              class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
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
          <li v-for="map in allMaps" :key="map.id"
            class="flex justify-between items-center border px-3 py-2 rounded hover:bg-muted cursor-pointer transition">
            <div class="flex flex-col">
              <span class="font-medium">{{ map.name }}</span>
              <span class="text-xs text-muted-foreground">{{ map.is_public ? 'Public' : 'Private' }}</span>
            </div>
            <div class="flex gap-2 items-center">
              <Button variant="destructive" size="sm" @click.stop="handleDelete()">
                Delete
              </Button>
            </div>
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
          Click the area to go to it, click the delete to delete it.
        </AlertDialogDescription>
      </AlertDialogHeader>
      <div v-if="userAreasInfo.length" class="my-4 space-y-2 max-h-[200px] overflow-y-auto">
        <p class="font-semibold text-sm text-muted-foreground mb-1">Your Areas:</p>
        <ul class="space-y-1">
          <li v-for="areas in userAreasInfo" :key="areas.id"
            class="flex justify-between items-center border px-3 py-2 rounded hover:bg-muted cursor-pointer transition">
            <span class="font-medium">{{ areas.name }}</span>

            <div class="flex gap-2 items-center">
              <Button variant="destructive" size="sm" @click.stop="handleAreaDelete({featureId: areas.feature_id})">
                Delete
              </Button>
            </div>
          </li>
        </ul>
      </div>

      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
      </AlertDialogFooter>
      <p v-if="error" class="text-red-500 mt-2">{{ error }}</p>
    </AlertDialogContent>
  </AlertDialog>

</template>
