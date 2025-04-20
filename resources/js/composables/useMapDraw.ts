import { ref } from 'vue'
import axios from 'axios'
import MapboxDraw from '@mapbox/mapbox-gl-draw'
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css'

interface Feature {
  id: string
  geometry: any
  properties: Record<string, any>
}

export function useMapDraw(
  map: mapboxgl.Map,
  emit: (event: string, payload: any) => void,
  userMapId: string | number,
  userAreas: Ref<any[]>
) {
  const draw = new MapboxDraw()
  async function saveUserArea(feature: Feature, isUpdate = false) {
    try {
      console.log(`${isUpdate ? 'Updating' : 'Saving'} user area:`, feature)

      const areaData = {
        feature_id: feature.id,
        name: feature.properties.name || `Area ${new Date().toLocaleString()}`,
        description: feature.properties.description || '',
        geometry: JSON.stringify(feature.geometry),
        properties: JSON.stringify(feature.properties || {}),
        user_map_id: userMapId,
      }

      let response
      if (isUpdate) {
        response = await axios.put(`/api/user-areas/${feature.id}`, areaData)
      } else {
        response = await axios.post('/api/user-areas', areaData)
      }

      console.log(`Area ${isUpdate ? 'updated' : 'saved'} successfully:`, response.data)

      const areaIndex = userAreas.value.findIndex(area => area.feature_id === feature.id)
      if (areaIndex >= 0) {
        userAreas.value[areaIndex] = response.data
      } else {
        userAreas.value.push(response.data)
      }

      return response.data
    } catch (error) {
      console.error(`Error ${isUpdate ? 'updating' : 'saving'} user area:`, error)
      alert(`Failed to ${isUpdate ? 'update' : 'save'} area. Please try again.`)
      return null
    }
  }

  async function deleteUserArea(featureId: string) {
    try {
      console.log('Deleting user area:', featureId)
      const response = await axios.delete(`/api/user-areas/${featureId}`)
      console.log('Area deleted successfully:', response.data)

      userAreas.value = userAreas.value.filter(area => area.feature_id !== featureId)
      return true
    } catch (error) {
      console.error('Error deleting user area:', error)
      alert('Failed to delete area. Please try again.')
      return false
    }
  }

  function handleDrawCreate(e: any) {
    const features = e.features
    console.log('Created features:', features)
    if (features && features.length > 0) {
      emit('draw-complete', features[0])
      saveUserArea(features[0])
    }
  }

  function handleDrawUpdate(e: any) {
    const features = e.features
    console.log('Updated features:', features)
    features.forEach(feature => saveUserArea(feature, true))
  }

  function handleDrawDelete(e: any) {
    const features = e.features
    console.log('Deleted features:', features)
    features.forEach(feature => deleteUserArea(feature.id))
  }

  function setupDrawEvents() {
    map.addControl(draw, 'top-left')
    map.on('draw.create', handleDrawCreate)
    map.on('draw.update', handleDrawUpdate)
    map.on('draw.delete', handleDrawDelete)
  }

  return {
    draw,
    setupDrawEvents,
  }
}
