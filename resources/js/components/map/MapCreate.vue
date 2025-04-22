<script setup lang="ts">
import { ref, onMounted } from 'vue'
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

const name = ref('')
const isPublic = ref(false)
const isDialogOpen = ref(false)
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
        <Button variant="secondary">Select Map</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Select or Create a Map</AlertDialogTitle>
          <AlertDialogDescription>
            Enter a name to create a new map. If a personal map exists, you'll be redirected to it.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div class="space-y-3">
          <input
            v-model="name"
            type="text"
            placeholder="Map name"
            class="w-full border p-2 rounded-md"
            required
          />
          <label class="flex items-center gap-2">
            <input type="checkbox" v-model="isPublic" />
            Public map
          </label>
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
