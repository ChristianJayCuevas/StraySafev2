import { ref, onMounted, onUnmounted } from 'vue';
import MapboxDraw from '@mapbox/mapbox-gl-draw';

export function useMapDraw(mapInstance: any) {
  const draw = ref<MapboxDraw | null>(null); // Reference to the MapboxDraw instance
  const userAreas = ref<any[]>([]); // Store user-created areas

  // Initialize the MapboxDraw instance
  const initializeDraw = () => {
    if (!mapInstance.value) return;

    draw.value = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      styles: [
        {
          id: 'gl-draw-polygon-fill-inactive',
          type: 'fill',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#3bb2d0',
            'fill-opacity': 0.4,
          },
        },
        {
          id: 'gl-draw-polygon-fill-active',
          type: 'fill',
          filter: ['all', ['==', 'active', 'true'], ['==', '$type', 'Polygon']],
          paint: {
            'fill-color': '#fbb03b',
            'fill-opacity': 0.6,
          },
        },
        {
          id: 'gl-draw-line-inactive',
          type: 'line',
          filter: ['all', ['==', 'active', 'false'], ['==', '$type', 'LineString']],
          layout: {
            'line-cap': 'round',
            'line-join': 'round',
          },
          paint: {
            'line-color': '#3bb2d0',
            'line-width': 2,
          },
        },
      ],
    });

    mapInstance.value.addControl(draw.value, 'top-left');
  };

  // Enable drawing mode
  const enableDrawingMode = (type: 'polygon' | 'line' | 'point', zoom: number | null = null) => {
    if (!mapInstance.value || !draw.value) return false;

    if (zoom !== null) {
      mapInstance.value.setZoom(zoom);
    }

    if (type === 'polygon') {
      draw.value.changeMode('draw_polygon');
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
  const saveUserArea = async (feature: any, isUpdate = false) => {
    try {
      const areaData = {
        feature_id: feature.id,
        name: feature.properties.name || `Area ${new Date().toLocaleString()}`,
        geometry: JSON.stringify(feature.geometry),
        properties: JSON.stringify(feature.properties || {}),
      };

      // Simulate API call
      console.log(`${isUpdate ? 'Updating' : 'Saving'} user area:`, areaData);

      // Update local state
      const areaIndex = userAreas.value.findIndex((area) => area.feature_id === feature.id);
      if (areaIndex >= 0) {
        userAreas.value[areaIndex] = areaData;
      } else {
        userAreas.value.push(areaData);
      }

      return areaData;
    } catch (error) {
      console.error('Error saving user area:', error);
      return null;
    }
  };

  // Delete a user area
  const deleteUserArea = async (featureId: string) => {
    try {
      console.log('Deleting user area:', featureId);

      // Simulate API call
      userAreas.value = userAreas.value.filter((area) => area.feature_id !== featureId);

      return true;
    } catch (error) {
      console.error('Error deleting user area:', error);
      return false;
    }
  };

  // Display user areas on the map
  const displayUserAreas = () => {
    if (!mapInstance.value || !draw.value) return;

    const featuresToAdd = userAreas.value.map((area) => ({
      id: area.feature_id,
      type: 'Feature',
      properties: JSON.parse(area.properties || '{}'),
      geometry: JSON.parse(area.geometry),
    }));

    draw.value.add({
      type: 'FeatureCollection',
      features: featuresToAdd,
    });
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
    cancelDrawing,
    saveUserArea,
    deleteUserArea,
    displayUserAreas,
  };
}