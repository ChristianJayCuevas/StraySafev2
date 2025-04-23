import { ref } from 'vue'
import axios from 'axios'

export function useUserAreas(drawRef: any, mapInstance: any) {
  const areas = ref([])
  const isLoading = ref(false)
  const error = ref(null)
  const userAreas = ref<any[]>([]);
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
  
      return savedArea;
    } catch (error) {
      console.error('❌ Failed to save user area:', error);
      return null;
    }
  };

  // Delete a user area
  const deleteUserArea = async (featureId: string) => {
    try {
      await axios.delete(`/user-areas/${featureId}`);
      userAreas.value = userAreas.value.filter((a) => a.feature_id !== featureId);
      draw.value?.delete(featureId);
      return true;
    } catch (error) {
      console.error('❌ Error deleting user area:', error);
      return false;
    }
  };
  const updateUserArea = async (feature: any) => {
    try {
      const payload = {
        name: feature.properties.name || `Area ${new Date().toLocaleString()}`,
        description: feature.properties.description || '',
        geometry: JSON.stringify(feature.geometry),
        properties: JSON.stringify(feature.properties || {}),
      };
  
      const response = await axios.put(`/user-areas/${feature.id}`, payload);
      const updatedArea = response.data;
  
      const index = userAreas.value.findIndex((a) => a.feature_id === feature.id);
      if (index >= 0) {
        userAreas.value[index] = updatedArea;
      }
  
      return updatedArea;
    } catch (error) {
      console.error('❌ Failed to update user area:', error);
      return null;
    }
  };
    const fetchUserAreas = async (mapId: number) => {
    isLoading.value = true
    try {
      const response = await axios.get('/user-areas', {
        params: { user_map_id: mapId }
      })
      areas.value = response.data
      displayUserAreas() // Display immediately after fetch
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
  
    const featuresToAdd = areas.value.map(area => ({
      id: area.feature_id,
      type: 'Feature',
      properties: JSON.parse(area.properties || '{}'),
      geometry: JSON.parse(area.geometry),
    }));
  
    // Add features to draw control
    drawRef.value.add({
      type: 'FeatureCollection',
      features: featuresToAdd
    });
  
    // ✅ Add/update the floating label layer
    if (!mapInstance.value.getSource('user-area-labels')) {
      mapInstance.value.addSource('user-area-labels', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: featuresToAdd,
        },
      });
  
      mapInstance.value.addLayer({
        id: 'user-area-label-layer',
        type: 'symbol',
        source: 'user-area-labels',
        layout: {
          'text-field': ['get', 'name'],
          'text-font': ['Open Sans Bold'],
          'text-size': 12,
          'text-offset': [0, 0.5],
          'text-anchor': 'top',
        },
        paint: {
          'text-color': '#FFFFFF',
        },
      });
    } else {
      const source = mapInstance.value.getSource('user-area-labels') as mapboxgl.GeoJSONSource;
      source.setData({
        type: 'FeatureCollection',
        features: featuresToAdd,
      });
    }
  };
  
  
  
  return {
    areas,
    isLoading,
    error,
    fetchUserAreas,
    displayUserAreas,
    saveUserArea,
    deleteUserArea,
    updateUserArea,
  }
}
