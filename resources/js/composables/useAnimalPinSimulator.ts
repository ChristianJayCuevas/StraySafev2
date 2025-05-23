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
    // Inject CSS styles if not already present
    if (!document.getElementById('animal-popup-styles')) {
      const styleSheet = document.createElement('style')
      styleSheet.id = 'animal-popup-styles'
      styleSheet.textContent = `
        .animal-popup {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          max-width: 280px;
          padding: 0;
          margin: 0;
        }
        .popup-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px 8px;
          border-bottom: 1px solid #e5e7eb;
          margin-bottom: 12px;
        }
        .popup-title {
          margin: 0;
          font-size: 16px;
          font-weight: 600;
          color: #1f2937;
          text-transform: capitalize;
        }
        .status-badge {
          padding: 4px 8px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .status-badge.stray {
          background-color: #fef3c7;
          color: #d97706;
          border: 1px solid #fcd34d;
        }
        .status-badge.not-stray {
          background-color: #d1fae5;
          color: #059669;
          border: 1px solid #6ee7b7;
        }
        .popup-image-container {
          margin-bottom: 12px;
          padding: 0 16px;
        }
        .popup-image {
          width: 100%;
          height: 160px;
          object-fit: cover;
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          transition: transform 0.2s ease;
        }
        .popup-image:hover {
          transform: scale(1.02);
        }
        .popup-no-image {
          margin-bottom: 12px;
          padding: 0 16px;
        }
        .no-image-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 120px;
          background-color: #f9fafb;
          border: 2px dashed #d1d5db;
          border-radius: 8px;
          color: #6b7280;
          font-size: 12px;
          gap: 8px;
        }
        .no-image-placeholder svg {
          opacity: 0.5;
        }
        .popup-details {
          padding: 0 16px 16px;
        }
        .detail-row {
          display: flex;
          margin-bottom: 8px;
          align-items: flex-start;
          gap: 8px;
        }
        .detail-row:last-child {
          margin-bottom: 0;
        }
        .detail-label {
          font-size: 12px;
          font-weight: 500;
          color: #6b7280;
          min-width: 80px;
          flex-shrink: 0;
        }
        .detail-value {
          font-size: 12px;
          color: #1f2937;
          word-break: break-word;
          line-height: 1.4;
        }
        .mapboxgl-popup-content {
          padding: 0 !important;
          border-radius: 12px !important;
          box-shadow: 0 10px 25px rgba(0, 0, 0, 0.15) !important;
          border: 1px solid #e5e7eb !important;
        }
        .mapboxgl-popup-close-button {
          font-size: 18px !important;
          padding: 8px !important;
          color: #6b7280 !important;
          right: 8px !important;
          top: 8px !important;
        }
        .mapboxgl-popup-close-button:hover {
          background-color: #f3f4f6 !important;
          color: #1f2937 !important;
        }
        .mapboxgl-popup-tip {
          border-top-color: #ffffff !important;
        }
        @media (max-width: 480px) {
          .animal-popup { max-width: 250px; }
          .popup-image { height: 140px; }
          .popup-header { padding: 10px 12px 6px; }
          .popup-details { padding: 0 12px 12px; }
        }
      `
      document.head.appendChild(styleSheet)
    }

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

    // Enhanced popup with image and better styling
    const popupContent = `
      <div class="animal-popup">
        <div class="popup-header">
          <h3 class="popup-title">${pin.animal_type || 'Unknown Animal'}</h3>
          <span class="status-badge ${pin.stray_status === 1 ? 'not-stray' : 'stray'}">
            ${pin.stray_status === 1 ? 'Not Stray' : 'Stray'}
          </span>
        </div>
        
        ${pin.picture ? `
          <div class="popup-image-container">
            <img src="${pin.picture}" alt="${pin.animal_type}" class="popup-image" />
          </div>
        ` : `
          <div class="popup-no-image">
            <div class="no-image-placeholder">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <circle cx="8.5" cy="8.5" r="1.5"/>
                <polyline points="21,15 16,10 5,21"/>
              </svg>
              <span>No image available</span>
            </div>
          </div>
        `}
        
        <div class="popup-details">
          <div class="detail-row">
            <span class="detail-label">Coordinates:</span>
            <span class="detail-value">${pin.latitude.toFixed(6)}, ${pin.longitude.toFixed(6)}</span>
          </div>
          ${pin.description ? `
            <div class="detail-row">
              <span class="detail-label">Description:</span>
              <span class="detail-value">${pin.description}</span>
            </div>
          ` : ''}
          ${pin.date_spotted ? `
            <div class="detail-row">
              <span class="detail-label">Spotted:</span>
              <span class="detail-value">${new Date(pin.date_spotted).toLocaleDateString()}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `

    const popup = new mapboxgl.Popup({ 
      offset: 25,
      closeButton: true,
      closeOnClick: false,
      maxWidth: '300px'
    }).setHTML(popupContent)

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
