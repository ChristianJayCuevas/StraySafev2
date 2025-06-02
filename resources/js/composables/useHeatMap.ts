import { ref, watch, computed } from 'vue'
import mapboxgl from 'mapbox-gl'
import * as turf from '@turf/turf'

export function useHeatmap(mapInstance: any, cameraPins: any, areas: any, animalPins: any) {
  const isHeatmapMode = ref(false)
  const areaHeatmapId = 'area-heatmap-layer'
  const pinHeatmapId = 'pin-heatmap-layer'
  const animalHeatmapId = 'animal-heatmap-layer' // New layer for animal pins
  
  // Using computed properties to prevent recalculation on every render
  const areaHeatmapData = computed(() => {
    if (!areas.value || areas.value.length === 0) return { type: 'FeatureCollection', features: [] }
    
    const heatmapPoints = []
    
    // For each area, generate multiple points within the polygon
    for (let i = 0; i < areas.value.length; i++) {
      try {
        const area = areas.value[i]
        const geometry = JSON.parse(area.geometry)
        
        // Create a point grid in the polygon
        if (geometry.type === 'Polygon') {
          const bbox = turf.bbox(geometry)
          const cellSide = 0.002 // Increased to reduce number of points (less lag)
          const poly = turf.polygon(geometry.coordinates)
          
          // Generate fewer points by increasing cellSide
          const pointGrid = turf.pointGrid(bbox, cellSide, { units: 'kilometers' })
          
          // Use slice to limit the number of points for large areas
          const maxPoints = 200
          const limitedPoints = pointGrid.features.slice(0, maxPoints)
          
          // Filter points to only include those within the polygon
          for (let j = 0; j < limitedPoints.length; j++) {
            const point = limitedPoints[j]
            if (turf.booleanPointInPolygon(point.geometry.coordinates, poly)) {
              // Simplified weight calculation - avoid expensive distance calculations
              const weight = 0.8 // Fixed weight to avoid calculations
              
              heatmapPoints.push({
                type: 'Feature',
                properties: { weight },
                geometry: {
                  type: 'Point',
                  coordinates: point.geometry.coordinates
                }
              })
            }
          }
        }
      } catch (error) {
        console.error('Error processing area for heatmap:', error)
      }
    }
    
    return {
      type: 'FeatureCollection',
      features: heatmapPoints
    }
  })
  
  // Using computed property for pin data
  const pinHeatmapData = computed(() => {
    if (!cameraPins.value || cameraPins.value.length === 0) {
      return { type: 'FeatureCollection', features: [] }
    }
    
    const features = []
    for (let i = 0; i < cameraPins.value.length; i++) {
      const pin = cameraPins.value[i]
      features.push({
        type: 'Feature',
        properties: { weight: 1 },
        geometry: {
          type: 'Point',
          coordinates: [pin.longitude, pin.latitude]
        }
      })
    }
    
    return {
      type: 'FeatureCollection',
      features
    }
  })

  // NEW: Using computed property for animal pin data
  const animalHeatmapData = computed(() => {
    if (!animalPins.value || animalPins.value.length === 0) {
      return { type: 'FeatureCollection', features: [] }
    }
    
    const features = []
    for (let i = 0; i < animalPins.value.length; i++) {
      const pin = animalPins.value[i]
      // Make sure the pin has valid coordinates
      if (pin.longitude && pin.latitude) {
        features.push({
          type: 'Feature',
          properties: { 
            weight: 1.2, // Slightly higher weight for animal pins to make them more prominent
            animal_type: pin.animal_type,
            stray_status: pin.stray_status
          },
          geometry: {
            type: 'Point',
            coordinates: [pin.longitude, pin.latitude]
          }
        })
      }
    }
    
    return {
      type: 'FeatureCollection',
      features
    }
  })
  
  // Create all heatmap layers
  const createHeatmapLayers = () => {
    if (!mapInstance.value) return
    
    // Remove existing layers if any
    removeHeatmapLayers()
    
    // Add pin heatmap (cameras)
    const pinData = pinHeatmapData.value
    if (pinData.features.length > 0) {
      // Add source for pin heatmap
      mapInstance.value.addSource('pin-heatmap-source', {
        type: 'geojson',
        data: pinData
      })
      
      // Add the heatmap layer for pins
      mapInstance.value.addLayer({
        id: pinHeatmapId,
        type: 'heatmap',
        source: 'pin-heatmap-source',
        paint: {
          // Fixed intensity for better performance
          'heatmap-intensity': 1.5,
          // Red color ramp for camera pins
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(255, 0, 0, 0)',
            0.2, 'rgba(255, 77, 77, 0.3)',
            0.4, 'rgba(255, 0, 0, 0.5)',
            0.6, 'rgba(204, 0, 0, 0.7)',
            0.8, 'rgba(153, 0, 0, 0.85)',
            1, 'rgba(102, 0, 0, 1)'
          ],
          // Fixed radius for better performance
          'heatmap-radius': 25,
          // Fixed opacity for better performance
          'heatmap-opacity': 0.8,
          // Use the 'weight' property
          'heatmap-weight': ['get', 'weight']
        }
      })
    }

    // NEW: Add animal heatmap
    const animalData = animalHeatmapData.value
    if (animalData.features.length > 0) {
      // Add source for animal heatmap
      mapInstance.value.addSource('animal-heatmap-source', {
        type: 'geojson',
        data: animalData
      })
      
      // Add the heatmap layer for animal pins
      mapInstance.value.addLayer({
        id: animalHeatmapId,
        type: 'heatmap',
        source: 'animal-heatmap-source',
        paint: {
          // Fixed intensity for better performance
          'heatmap-intensity': 1.8, // Slightly higher intensity for animals
          // Orange/Yellow color ramp for animal pins
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(255, 165, 0, 0)', // Transparent orange
            0.2, 'rgba(255, 165, 0, 0.3)', // Light orange
            0.4, 'rgba(255, 140, 0, 0.5)', // Orange
            0.6, 'rgba(255, 69, 0, 0.7)', // Red-orange
            0.8, 'rgba(255, 0, 0, 0.85)', // Red
            1, 'rgba(139, 0, 0, 1)' // Dark red
          ],
          // Fixed radius for better performance
          'heatmap-radius': 30, // Slightly larger radius for animal pins
          // Fixed opacity for better performance
          'heatmap-opacity': 0.7,
          // Use the 'weight' property
          'heatmap-weight': ['get', 'weight']
        }
      })
    }
  }
  
  // Debounced function to prevent excessive layer updates
  let debounceTimer: number | null = null
  const debouncedCreateLayers = () => {
    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }
    
    debounceTimer = window.setTimeout(() => {
      createHeatmapLayers()
    }, 300) // 300ms debounce
  }
  
  // Function to toggle heatmap mode on/off
  const toggleHeatmap = (value: boolean) => {
    isHeatmapMode.value = value
    
    if (!mapInstance.value) return
    
    if (isHeatmapMode.value) {
      createHeatmapLayers()
    } else {
      removeHeatmapLayers()
    }
  }
  
  // Remove heatmap layers
  const removeHeatmapLayers = () => {
    if (!mapInstance.value) return
    
    // Remove area heatmap
    if (mapInstance.value.getLayer(areaHeatmapId)) {
      mapInstance.value.removeLayer(areaHeatmapId)
    }
    if (mapInstance.value.getSource('area-heatmap-source')) {
      mapInstance.value.removeSource('area-heatmap-source')
    }
    
    // Remove pin heatmap
    if (mapInstance.value.getLayer(pinHeatmapId)) {
      mapInstance.value.removeLayer(pinHeatmapId)
    }
    if (mapInstance.value.getSource('pin-heatmap-source')) {
      mapInstance.value.removeSource('pin-heatmap-source')
    }

    // NEW: Remove animal heatmap
    if (mapInstance.value.getLayer(animalHeatmapId)) {
      mapInstance.value.removeLayer(animalHeatmapId)
    }
    if (mapInstance.value.getSource('animal-heatmap-source')) {
      mapInstance.value.removeSource('animal-heatmap-source')
    }
  }
  
  // Watch for changes in area, pin, or animal data and update heatmap if it's active
  watch([areas, cameraPins, animalPins], () => {
    if (isHeatmapMode.value) {
      debouncedCreateLayers()
    }
  })
  
  return {
    isHeatmapMode,
    toggleHeatmap,
    createHeatmapLayers,
    removeHeatmapLayers
  }
}