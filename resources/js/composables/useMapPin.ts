import { ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import axios from 'axios'

export function useMapPins(mapInstance: any, userMapId: number) {
  const isAddPinMode = ref(false)
  const cameraPins = ref<any[]>([])
  const onPinLocationSelected = ref<(() => void) | null>(null)
  const selectedLocation = ref<{ lat: number, lng: number } | null>(null)
  const enableAddPinMode = () => {
    isAddPinMode.value = true
    selectedLocation.value = null
  
    if (!mapInstance.value) return
    mapInstance.value.getCanvas().style.cursor = 'crosshair'
  
    mapInstance.value.once('click', (e: mapboxgl.MapMouseEvent & mapboxgl.EventData) => {
      const lngLat = e.lngLat
      selectedLocation.value = { lat: lngLat.lat, lng: lngLat.lng }
  
      isAddPinMode.value = false
      mapInstance.value.getCanvas().style.cursor = ''
  
      // 👇 Call the external handler
      onPinLocationSelected.value?.()
    })
  }
  const saveCameraPin = async ({
    name,
    description,
    hls,
  }: {
    name: string
    description: string
    hls: string
  }) => {
    if (!selectedLocation.value) {
      console.warn('⚠️ No location selected.')
      return
    }

    const payload = {
      camera_name: name,
      camera_description: description,
      hls_url: hls,
      latitude: selectedLocation.value.lat,
      longitude: selectedLocation.value.lng,
      user_map_id: userMapId
    }

    try {
      const response = await axios.post('/camera-pins', payload)
      const pin = response.data.pin
      cameraPins.value.push(pin)

      new mapboxgl.Marker({ color: '#FF5722' })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${pin.camera_name}</strong><br>${pin.camera_description}`))
        .addTo(mapInstance.value)

      selectedLocation.value = null
    } catch (error) {
      console.error('❌ Failed to save pin:', error)
    }
  }
  const cancelAddPinMode = () => {
    isAddPinMode.value = false
    if (mapInstance.value) {
      mapInstance.value.getCanvas().style.cursor = ''
    }
  }

  const fetchCameraPins = async (userMapId: number) => {
    try {
      const response = await axios.get('/camera-pins', {
        params: { user_map_id: userMapId }
      })
      cameraPins.value = response.data
      displayCameraPins();
    } catch (error) {
      console.error('❌ Failed to fetch pins:', error)
      return []
    }
  }

  const displayCameraPins = () => {
    if (!mapInstance.value) return

    cameraPins.value.forEach(pin => {
      new mapboxgl.Marker({ color: '#2196F3' })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(new mapboxgl.Popup().setHTML(`<strong>${pin.camera_name}</strong><br>${pin.camera_description}`))
        .addTo(mapInstance.value)
    })
  }

  return {
    isAddPinMode,
    cameraPins,
    enableAddPinMode,
    saveCameraPin,
    cancelAddPinMode,
    fetchCameraPins,
    displayCameraPins,
    onPinLocationSelected // ✅ expose this
  }
}
