import { ref } from 'vue'
import axios from 'axios'
import * as turf from '@turf/turf';
import mapboxgl from 'mapbox-gl';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';
export function useUserAreas(drawRef: any, mapInstance: any) {
  const areas = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const userAreas = ref<any[]>([]);
  const labelMarkers = ref<mapboxgl.Marker[]>([]);
  
  const saveUserArea = async (feature: any, isUpdate = false, userMapId?: number, userAreaName?: any) => {
    console.log('Drawing completed, saving area:', feature)
    console.log('ID in composable:', userMapId)
    console.log('Name in composable:', userAreaName)
    try {
      const payload = {
        feature_id: feature.id,
        name: userAreaName || feature.properties.name || `Area ${new Date().toLocaleString()}`,
        description: feature.properties.description || '',
        geometry: JSON.stringify(feature.geometry),
        properties: JSON.stringify(feature.properties || {}),
        user_map_id: userMapId,
      };
  
      const endpoint = isUpdate
        ? `/user-areas/${feature.id}` // for update
        : `/user-areas`;             // for create
  
      const response = isUpdate
        ? await axios.put(endpoint, payload)
        : await axios.post(endpoint, payload);
  
      const savedArea = response.data;
  
      const index = userAreas.value.findIndex((a) => a.feature_id === feature.id);
      if (index >= 0) {
        userAreas.value[index] = savedArea;
      } else {
        userAreas.value.push(savedArea);
      }
  
      // 🧹 ✅ After saving, immediately re-fetch and re-display as static
      if (userMapId) {
        await fetchUserAreas(userMapId);
      }
  
      return savedArea;
    } catch (error) {
      console.error('❌ Failed to save user area:', error);
      return null;
    }
  };
  

  // Delete a user area
  const deleteUserArea = async ({ featureId }: { featureId: string }) => {
    try {
      await axios.delete(`/user-areas/${featureId}`);
      
      // Remove from areas list
      userAreas.value = userAreas.value.filter((a) => a.feature_id !== featureId);
      
      // Delete the polygon
      drawRef.value?.delete(featureId);
  
      // 🧹 Delete the matching floating label
      const markerIndex = labelMarkers.value.findIndex(marker => {
        const markerLngLat = marker.getLngLat();
        // Compare marker position if needed, or better: store `featureId` in marker itself
        return marker.getElement()?.dataset?.featureId === featureId;
      });
  
      if (markerIndex !== -1) {
        labelMarkers.value[markerIndex].remove(); // Remove from map
        labelMarkers.value.splice(markerIndex, 1); // Remove from array
      }
  
      return true;
    } catch (error) {
      console.error('❌ Error deleting user area:', error);
      return false;
    }
  };
  

  const fetchUserAreas = async (mapId: number) => {
    isLoading.value = true
    try {
      const response = await axios.get('/user-areas', {
        params: { user_map_id: mapId }
      })
      areas.value = response.data
      displayUserAreas()
      return areas
    } catch (err: any) {
      error.value = err?.response?.data?.message || 'Failed to load areas.'
    } finally {
      isLoading.value = false
    }
  }
  // Display on map
  const displayUserAreas = () => {
    if (!drawRef.value || !mapInstance.value) {
      console.warn('Draw or map instance not initialized');
      return;
    }
  
    const map = mapInstance.value;
  
    // 🧹 Remove previous saved areas layer if exists
    if (map.getSource('saved-areas')) {
      map.removeLayer('saved-areas-fill');
      map.removeLayer('saved-areas-outline');
      map.removeSource('saved-areas');
    }
  
    const featuresToAdd = areas.value.map(area => {
      const geometry = JSON.parse(area.geometry);
      const properties = {
        ...(JSON.parse(area.properties || '{}')),
        name: area.name,
      };
  
      return {
        id: area.feature_id,
        type: 'Feature',
        properties,
        geometry,
      };
    });
  
    if (featuresToAdd.length === 0) return;
  
    // 🗺️ Add as STATIC layer
    map.addSource('saved-areas', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: featuresToAdd
      }
    });
  
    // 🔵 Area fill
    map.addLayer({
      id: 'saved-areas-fill',
      type: 'fill',
      source: 'saved-areas',
      paint: {
        'fill-color': '#00BCD4',
        'fill-opacity': 0.3
      }
    });
  
    // 🔵 Area border
    map.addLayer({
      id: 'saved-areas-outline',
      type: 'line',
      source: 'saved-areas',
      paint: {
        'line-color': '#00ACC1',
        'line-width': 2
      }
    });
  
    // 🛬 Zoom to first feature
    const firstFeature = featuresToAdd[0];
    const center = turf.centroid(firstFeature).geometry.coordinates;
  
    map.flyTo({
      center: center as [number, number],
      zoom: 16,
      speed: 1.2,
      curve: 1,
      easing(t) { return t; }
    });
  
    // 🧹 Remove previous floating labels
    labelMarkers.value.forEach(marker => marker.remove());
    labelMarkers.value = [];
  
    // 🧱 Add floating labels
    featuresToAdd.forEach(feature => {
      const center = turf.centroid(feature).geometry.coordinates;
      const labelEl = document.createElement('div');
      labelEl.className = 'rounded-label';
      labelEl.innerText = feature.properties.name;
  
      const marker = new mapboxgl.Marker({
        element: labelEl,
        anchor: 'center'
      })
        .setLngLat(center as [number, number])
        .addTo(map);
  
      labelEl.dataset.featureId = feature.id;
      labelMarkers.value.push(marker);
    });
  };
  
  
  
  
  
  
  return {
    areas,
    isLoading,
    error,
    fetchUserAreas,
    displayUserAreas,
    saveUserArea,
    deleteUserArea,
  }
}
