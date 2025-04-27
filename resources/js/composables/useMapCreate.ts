// useMapCreate.ts
import { ref, computed, watch, onMounted } from 'vue'
import axios from 'axios'

const isLoading = ref(false)
const error = ref<string | null>(null)
const personalMap = ref<any>(null)
const createdMap = ref<any>(null)
const ownedMaps = ref<any[]>([])
const accessibleMaps = ref<any[]>([])

const allMaps = computed(() => {
  const ids = new Set()
  return [...ownedMaps.value, ...accessibleMaps.value].filter(map => {
    if (ids.has(map.id)) return false
    ids.add(map.id)
    return true
  })
})

export function useMapCreate() {
  const loadUserMaps = async () => {
    isLoading.value = true
    error.value = null
    try {
      const response = await axios.get('/user-maps')
      console.log('🛰️ /user-maps response:', response.data)
  
      ownedMaps.value = response.data.owned_maps || []
      accessibleMaps.value = response.data.accessible_maps || []
  
      console.log('✅ Owned maps:', ownedMaps.value)
      console.log('✅ Accessible maps:', accessibleMaps.value)
  
      if (ownedMaps.value.length > 0) {
        personalMap.value = ownedMaps.value[0]
      }
    } catch (err: any) {
      console.error('❌ Error loading user maps:', err)
      error.value = err?.response?.data?.message || 'Failed to load maps.'
    } finally {
      isLoading.value = false
    }
  }
  
  const createMap = async ({
    name,
    description = '',
    is_public = false,
    default_view = {
      center: [120.9842, 14.5995],
      zoom: 12,
    }
  }: {
    name: string
    description?: string
    is_public?: boolean
    default_view?: { center: number[]; zoom: number }
  }) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await axios.post('/user-maps', {
        name, description, is_public, default_view
      })

      if (response.data.success) {
        createdMap.value = response.data.map
        personalMap.value = createdMap.value
        return createdMap.value
      } else {
        error.value = response.data.message || 'Map creation failed.'
        return null
      }
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Map creation failed.'
      return null
    } finally {
      isLoading.value = false
    }
  }
  const deleteMap = async ({mapId}:{mapId: number}) => {
  
    try {
      const response = await axios.delete(`/user-maps/${mapId}`)
  
      // If the deleted map is the current one, clear it
      if (personalMap.value?.id === mapId) {
        personalMap.value = null
        createdMap.value = null
        localStorage.removeItem('current_map')
      }

      if (response.data.success) {
        await loadUserMaps()
        return true
      }
      else {
        error.value = response.data.message || 'Map deletion failed.'
        return false
      }
        // Refresh the map list
  
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Map creation failed.'
      return false
    }
  }
  
  watch(createdMap, (val) => {
    if (val) {
      localStorage.setItem('current_map', JSON.stringify(val))
    }
  })
  
  onMounted(() => {
    const fromStorage = localStorage.getItem('current_map')
    if (fromStorage) {
      createdMap.value = JSON.parse(fromStorage)
    }
  })
  return {
    isLoading,
    error,
    personalMap,
    createdMap,
    ownedMaps,
    accessibleMaps,
    allMaps,
    loadUserMaps,
    createMap,
    deleteMap
    
  }
}
