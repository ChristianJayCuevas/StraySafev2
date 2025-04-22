import { ref } from 'vue'
import axios from 'axios'

export function useUserAreas() {
  const areas = ref([])
  const isLoading = ref(false)
  const error = ref(null)

  const loadAreas = async (mapId: number) => {
    isLoading.value = true
    error.value = null

    try {
      const response = await axios.get('/user-areas', {
        params: { user_map_id: mapId }
      })
      areas.value = response.data
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Failed to load areas.'
    } finally {
      isLoading.value = false
    }
  }
  
  return {
    areas,
    isLoading,
    error,
    loadAreas
  }
}
