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
    
    // Set initial small size
    el.style.width = '30px'
    el.style.height = '42px'
    
    // Inject your custom SVG with viewBox preserved but width/height removed
    // to allow CSS scaling
    el.innerHTML = `
      <?xml version="1.0" encoding="UTF-8"?>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
        <!-- Pin Base -->
        <path d="M50,140c0,0-50-60-50-90c0-27.6,22.4-50,50-50s50,22.4,50,50C100,80,50,140,50,140z" fill="#FF5733"/>
        
        <!-- Dog Face -->
        <g transform="translate(15, 15)">
          <!-- Head -->
          <circle cx="35" cy="35" r="28" fill="#8B4513"/>
          
          <!-- Ears -->
          <path d="M12,20 Q5,5 15,15 Z" fill="#663300"/>
          <path d="M58,20 Q65,5 55,15 Z" fill="#663300"/>
          
          <!-- Eyes -->
          <ellipse cx="25" cy="30" rx="5" ry="6" fill="white"/>
          <ellipse cx="45" cy="30" rx="5" ry="6" fill="white"/>
          <circle cx="25" cy="31" r="3" fill="black"/>
          <circle cx="45" cy="31" r="3" fill="black"/>
          
          <!-- Nose and Mouth -->
          <ellipse cx="35" cy="42" rx="8" ry="5" fill="#333"/>
          <path d="M35,47 L35,53 M35,53 Q28,58 25,53 M35,53 Q42,58 45,53" fill="none" stroke="#333" stroke-width="2" stroke-linecap="round"/>
          
          <!-- Spots (Optional) -->
          <path d="M15,45 Q20,55 30,50 Q25,40 15,45 Z" fill="#663300"/>
          <path d="M55,45 Q50,55 40,50 Q45,40 55,45 Z" fill="#663300"/>
        </g>
      </svg>
    `

    const marker = new mapboxgl.Marker(el)
      .setLngLat([pin.longitude, pin.latitude])
      .addTo(mapInstance.value)

    const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
      <div>
        ${pin.picture ? `<img src="${pin.picture}" alt="Animal photo" style="width: 100%; max-width: 200px; height: auto; border-radius: 4px; margin-bottom: 8px;"><br>` : ''}
        <strong>Type:</strong> ${pin.animal_type}<br>
        <strong>Status:</strong> ${pin.stray_status === 1 ? 'Stray' : 'Not Stray'}<br>
        <strong>Longitude:</strong> ${pin.longitude}<br>
        <strong>Latitude:</strong> ${pin.latitude}
      </div>
    `)

    marker.setPopup(popup)
    
    // Add zoom-based resizing
    mapInstance.value.on('zoom', () => {
      const zoom = mapInstance.value.getZoom()
      let size
      
      // Scale based on zoom level
      if (zoom < 10) {
        size = 15 // Very small at far zoom
      } else if (zoom < 13) {
        size = 20 // Small at medium zoom
      } else if (zoom < 15) {
        size = 25 // Medium at closer zoom
      } else {
        size = 30 // Regular size when zoomed in
      }
      
      // Apply the new size
      el.style.width = `${size}px`
      el.style.height = `${Math.floor(size * 1.4)}px` // Keep aspect ratio
    })
    
    // Trigger initial resize based on current zoom
    const initialZoom = mapInstance.value.getZoom()
    let initialSize
    
    if (initialZoom < 10) {
      initialSize = 15
    } else if (initialZoom < 13) {
      initialSize = 20
    } else if (initialZoom < 15) {
      initialSize = 25
    } else {
      initialSize = 30
    }
    
    el.style.width = `${initialSize}px`
    el.style.height = `${Math.floor(initialSize * 1.4)}px`
    
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
