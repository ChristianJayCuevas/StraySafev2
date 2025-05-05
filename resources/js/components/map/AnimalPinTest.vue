<script setup lang="ts">
import { ref, inject } from 'vue'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

const map = inject('map')
const {
  isAddPinMode,
  enableAddPinMode,
  saveAnimalPin,
  fetchAnimalPins,
  cameraPins,
} = inject('useMapPins')

const selectedCamera = ref('')
const animalType = ref('')
const strayStatus = ref('')
const animalName = ref('')
const selectedMapId = ref(1) // Default map ID for testing

const animalTypes = [
  'Dog',
  'Cat',
  'Bird',
  'Other'
]

const strayStatuses = [
  'Stray',
  'Owned',
  'Unknown'
]

const handleAddAnimalPin = async () => {
  if (!selectedCamera.value || !animalType.value || !strayStatus.value) {
    alert('Please fill in all required fields')
    return
  }

  try {
    await saveAnimalPin({
      animalType: animalType.value,
      strayStatus: strayStatus.value,
      animalName: animalName.value,
      cameraPinId: parseInt(selectedCamera.value),
      mapId: selectedMapId.value
    })

    // Reset form
    animalType.value = ''
    strayStatus.value = ''
    animalName.value = ''
    selectedCamera.value = ''
  } catch (error) {
    console.error('Failed to add animal pin:', error)
  }
}

const handleFetchPins = () => {
  fetchAnimalPins(selectedMapId.value)
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-50 bg-white p-4 rounded-lg shadow-lg">
    <h3 class="text-lg font-semibold mb-4">Animal Pin Test</h3>
    
    <div class="space-y-4">
      <!-- Camera Selection -->
      <div>
        <label class="block text-sm font-medium mb-1">Select Camera</label>
        <Select v-model="selectedCamera">
          <SelectTrigger>
            <SelectValue placeholder="Select a camera" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="camera in cameraPins" :key="camera.id" :value="camera.id.toString()">
              {{ camera.camera_name }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Animal Type -->
      <div>
        <label class="block text-sm font-medium mb-1">Animal Type</label>
        <Select v-model="animalType">
          <SelectTrigger>
            <SelectValue placeholder="Select animal type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="type in animalTypes" :key="type" :value="type">
              {{ type }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Stray Status -->
      <div>
        <label class="block text-sm font-medium mb-1">Stray Status</label>
        <Select v-model="strayStatus">
          <SelectTrigger>
            <SelectValue placeholder="Select status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem v-for="status in strayStatuses" :key="status" :value="status">
              {{ status }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <!-- Animal Name -->
      <div>
        <label class="block text-sm font-medium mb-1">Animal Name (Optional)</label>
        <Input v-model="animalName" placeholder="Enter animal name" />
      </div>

      <!-- Action Buttons -->
      <div class="flex gap-2">
        <Button @click="handleAddAnimalPin" class="flex-1">
          Add Animal Pin
        </Button>
        <Button @click="handleFetchPins" variant="outline">
          Refresh Pins
        </Button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.fixed {
  position: fixed;
}
</style> 