import { ref } from 'vue'
import type { AnimalPinInput, AnimalPin } from '@/types'
import axios from 'axios'
import mapboxgl from 'mapbox-gl'

export function useAnimalPinSimulator(mapInstance: any) {
  const cameraPins2 = ref<any[]>([])
  const animalPins = ref<any[]>([])
  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const simulatedPins = ref<any[]>([])

  // Helper: Add animal pin to map with SVG and popup
  const addAnimalPinToMap = (pin: any) => {
    const el = document.createElement('div')
    el.className = 'animal-pin'

    // Inject your custom SVG here
    el.innerHTML = `
      <svg width="30" height="30" viewBox="0 0 24 24" fill="red" xmlns="http://www.w3.org/2000/svg">
        <circle cx="12" cy="12" r="10" stroke="black" stroke-width="2" fill="red"/>
      </svg>
    `

    const marker = new mapboxgl.Marker(el)
      .setLngLat([pin.longitude, pin.latitude])
      .addTo(mapInstance.value)

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div>
        <strong>Type:</strong> ${pin.animal_type}<br>
        <strong>Status:</strong> ${pin.stray_status}
      </div>
    `)

    marker.setPopup(popup)

    console.log('Added animal pin to map:', pin)
    return marker
  }

  // Fetch and display all animal pins on the map
  const fetchAnimalPins = async (userMapId: number) => {
    try {
      isLoading.value = true
      console.log("CALLED fetchAnimalPins with userMapId:", userMapId)
  
      const response = await axios.get('/animalpins', {
        params: { user_map_id: userMapId }
      })
  
      console.log('Full API response:', response)
      console.log('Response data:', response.data)
  
      const pins = Array.isArray(response.data) ? response.data : response.data?.pins ?? []
      console.log('Processed pins array:', pins)
  
      animalPins.value = pins
  
      if (pins.length === 0) {
        console.warn('No pins found in response')
        return
      }
  
      pins.forEach((pin, index) => {
        console.log(`Processing pin ${index}:`, pin)
        
        if (pin.latitude && pin.longitude) {
          console.log(`Adding pin ${index} at coordinates:`, pin.latitude, pin.longitude)
          addAnimalPinToMap(pin)
        } else {
          console.warn(`Pin ${index} missing coordinates:`, pin)
        }
      })
  
    } catch (err) {
      console.error('Error fetching animal pins:', err)
      error.value = 'Failed to fetch animal pins.'
    } finally {
      isLoading.value = false
    }
  }
  // Fetch available camera pins
  const fetchCameraPins2 = async (userMapId: number) => {
    try {
      isLoading.value = true
      if (!userMapId) {
        console.warn('No userMapId provided to fetchCameraPins')
        return
      }

      const response = await axios.get('/camera-pins', {
        params: { user_map_id: userMapId }
      })
      cameraPins2.value = response.data
    } catch (err) {
      error.value = 'Failed to fetch camera pins.'
    } finally {
      isLoading.value = false
    }
  }

  // Simulate sending an animal pin
  const simulateAnimalPin = async (data: AnimalPinInput) => {
    try {
      isLoading.value = true
      console.log('Sending animal pin payload:', data)

      const response = await axios.post('/animalpins', {
        animal_type: data.animal_type,
        stray_status: data.stray_status,
        camera: data.cameraName,
      })

      const pin = response.data.pin
      simulatedPins.value.push(pin)

      if (pin.longitude && pin.latitude) {
        addAnimalPinToMap(pin)
      }

      return pin
    } catch (err: any) {
      console.error('Simulation error:', err)
      error.value = err.response?.data?.message || 'Simulation failed.'
    } finally {
      isLoading.value = false
    }
  }

  return {
    cameraPins2,
    animalPins,
    isLoading,
    error,
    simulatedPins,
    fetchCameraPins2,
    fetchAnimalPins,
    simulateAnimalPin,
  }
}
