import { ref, onMounted, onUnmounted, watch } from 'vue';
import axios from 'axios'
import mapboxgl from 'mapbox-gl'
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import 'mapbox-gl/dist/mapbox-gl.css';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

export function useMapDraw(mapInstance: any, onDrawComplete?: (feature: any) => void) {
  const draw = ref<MapboxDraw | null>(null); // Reference to the MapboxDraw instance
  const userAreas = ref<any[]>([]); // Store user-created areas
  watch(
    () => mapInstance.value,
    (val) => {
      if (val && !draw.value) {
        initializeDraw()
      }
    },
    { immediate: true }
  )
  // Initialize the MapboxDraw instance
  const initializeDraw = () => {
    if (!mapInstance.value) return;

    draw.value = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
      },
      styles: [
        {
          'id': 'gl-draw-polygon-fill-inactive',
          'type': 'fill',
          'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          'paint': {
            'fill-color': '#3f51b5',
            'fill-outline-color': '#7986cb',
            'fill-opacity': 0.4
          }
        },
        {
          'id': 'gl-draw-polygon-fill-active',
          'type': 'fill',
          'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          'paint': {
            'fill-color': '#3bb2d0',
            'fill-outline-color': '#3bb2d0',
            'fill-opacity': 0.7
          }
        },
        {
          'id': 'gl-draw-polygon-midpoint',
          'type': 'circle',
          'filter': ['all', ['==', '$type', 'Point'], ['==', 'meta', 'midpoint']],
          'paint': {
            'circle-radius': 3,
            'circle-color': '#fbb03b'
          }
        },
        {
          'id': 'gl-draw-polygon-stroke-inactive',
          'type': 'line',
          'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          'layout': {
            'line-cap': 'round',
            'line-join': 'round'
          },
          'paint': {
            'line-color': '#7986cb',
            'line-width': 2
          }
        },
        {
          'id': 'gl-draw-polygon-stroke-active',
          'type': 'line',
          'filter': ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          'layout': {
            'line-cap': 'round',
            'line-join': 'round'
          },
          'paint': {
            'line-color': '#3bb2d0',
            'line-dasharray': [0.2, 2],
            'line-width': 2
          }
        },
        {
          'id': 'gl-draw-line-inactive',
          'type': 'line',
          'filter': ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString']],
          'layout': {
            'line-cap': 'round',
            'line-join': 'round'
          },
          'paint': {
            'line-color': '#7986cb',
            'line-width': 2
          }
        },
        {
          'id': 'gl-draw-polygon-and-line-vertex-stroke-inactive',
          'type': 'circle',
          'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          'paint': {
            'circle-radius': 5,
            'circle-color': '#fff'
          }
        },
        {
          'id': 'gl-draw-polygon-and-line-vertex-inactive',
          'type': 'circle',
          'filter': ['all', ['==', 'meta', 'vertex'], ['==', '$type', 'Point']],
          'paint': {
            'circle-radius': 3,
            'circle-color': '#7986cb'
          }
        }
      ]
    });

    mapInstance.value.addControl(draw.value);

    mapInstance.value.on('draw.create', (e: any) => {
      const feature = e.features?.[0];
      if (feature?.geometry?.type === 'Polygon') {
        onDrawComplete?.(feature);
      } else {
        console.warn('Invalid feature created:', feature);
      }
    });
  
    // Show popup on click (once map is loaded)
    mapInstance.value.on('load', () => {
      // Add click handler to show popup on area click
      mapInstance.value.on('click', (e: any) => {
        const features = mapInstance.value.queryRenderedFeatures(e.point, {
          layers: ['gl-draw-polygon-fill-inactive', 'gl-draw-polygon-fill-active'],
        });
  
        if (features.length && draw.value) {
          const feature = features[0];
  
          // Remove existing popups
          document.querySelectorAll('.map-popup').forEach((el) => el.remove());
  
          const popupNode = document.createElement('div');
          popupNode.className = 'map-popup bg-white shadow-md rounded p-2 text-sm';
          popupNode.innerHTML = `
            <strong>${feature.properties?.name || 'Unnamed Area'}</strong><br />
            <button id="edit-area-btn" class="text-blue-600 hover:underline">Edit</button> |
            <button id="delete-area-btn" class="text-red-600 hover:underline">Delete</button>
          `;
  
          const popup = new mapboxgl.Popup({ closeOnClick: true })
            .setLngLat(e.lngLat)
            .setDOMContent(popupNode)
            .addTo(mapInstance.value);
  
          popupNode.querySelector('#edit-area-btn')?.addEventListener('click', () => {
            draw.value?.changeMode('direct_select', { featureId: feature.id });
            popup.remove();
          });
  
          popupNode.querySelector('#delete-area-btn')?.addEventListener('click', async () => {
            await deleteUserArea(feature.id);
            popup.remove();
          });
        }
      });
  
      // Hide popup on map move
      mapInstance.value.on('move', () => {
        document.querySelectorAll('.map-popup').forEach((el) => el.remove());
      });
    });
    
  };

  // Enable drawing mode
  const enableDrawingMode = (type: 'polygon' | 'line' | 'point', zoom: number | null = null) => {
    if (!mapInstance.value || !draw.value){ 
      console.warn('Map or draw is not ready')
      return false;
    }
    if (zoom !== null) {
      mapInstance.value.setZoom(zoom);
    }

    if (type === 'polygon') {
      draw.value.changeMode('draw_polygon');
      console.log('Drawing mode set to polygon');
    } else if (type === 'line') {
      draw.value.changeMode('draw_line_string');
    } else if (type === 'point') {
      draw.value.changeMode('draw_point');
    }

    return true;
  };

  // Disable drawing mode
  const disableDrawingMode = () => {
    if (!mapInstance.value || !draw.value) return false;

    draw.value.changeMode('simple_select');
    return true;
  };

  // Cancel current drawing
  const cancelDrawing = () => {
    if (!mapInstance.value || !draw.value) return false;

    draw.value.trash();
    draw.value.changeMode('simple_select');
    return true;
  };

  // Save a user-created area
  const saveUserArea = async (feature: any, isUpdate = false, userMapId?: number) => {
    if (!feature?.id || !feature?.geometry) {
      console.error('Invalid feature object:', feature);
      return null;
    }
  
    try {
      const payload = {
        feature_id: feature.id,
        name: feature.properties.name || `Area ${new Date().toLocaleString()}`,
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
  // Clean up on unmount
  const cleanup = () => {
    if (mapInstance.value && draw.value) {
      mapInstance.value.removeControl(draw.value);
    }
  };

  onMounted(() => {
    initializeDraw();
  });

  onUnmounted(() => {
    cleanup();
  });

  return {
    draw,
    userAreas,
    enableDrawingMode,
    disableDrawingMode,
    updateUserArea,
    cancelDrawing,
    saveUserArea,
    deleteUserArea,
  };
}