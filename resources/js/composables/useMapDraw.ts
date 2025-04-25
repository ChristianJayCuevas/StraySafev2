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
    if (!mapInstance.value || draw.value) return;

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

    mapInstance.value.addControl(draw.value, 'top-left');
    console.log('Draw control added');

    mapInstance.value.on('draw.create', (e: any) => {
      const feature = e.features[0];
      console.log('Feature created:', feature);
      userAreas.value.push(feature);
      onDrawComplete?.(feature);

    });
    
  };

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

  // Cancel current drawing
  const cancelDrawing = () => {
    if (!mapInstance.value || !draw.value) return false;

    draw.value.trash();
    draw.value.changeMode('simple_select');
    return true;
  };

  const finishDrawing = () => {
    if (!mapInstance.value || !draw.value) return false;
    draw.value.changeMode('simple_select');
    return true;
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
    mainMap: mapInstance,
    userAreas,
    enableDrawingMode,
    cancelDrawing,
    initializeDraw,
    finishDrawing
  };
}