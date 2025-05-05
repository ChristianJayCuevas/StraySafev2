import { ref } from 'vue'
import mapboxgl from 'mapbox-gl'
import axios from 'axios'

export function useMapPins(mapInstance: any) {
  const isAddPinMode = ref(false)
  const cameraPins = ref<any[]>([])
  const onPinLocationSelected = ref<(() => void) | null>(null)
  const selectedLocation = ref<{ lat: number, lng: number } | null>(null)
  const markerRefs = ref<mapboxgl.Marker[]>([])

  const enableAddPinMode = () => {
    isAddPinMode.value = true
    selectedLocation.value = null

    if (!mapInstance.value) return
    mapInstance.value.getCanvas().style.cursor = 'crosshair'

    mapInstance.value.once('click', (e: any) => {
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
    mapId,
    direction = 0, // 📐 Add direction (degrees)
  }: {
    name: string
    description: string
    hls: string
    mapId: number
    direction?: number
  }) => {
    if (!selectedLocation.value) {
      console.warn('⚠️ No location selected.');
      return;
    }
  
    const payload = {
      camera_name: name,
      camera_description: description,
      hls_url: hls,
      latitude: selectedLocation.value.lat,
      longitude: selectedLocation.value.lng,
      user_map_id: mapId,
      direction: direction, // 📍 save direction if you want (optional)
    };
  
    try {
      const response = await axios.post('/camera-pins', payload);
      const pin = { ...response.data.pin, direction }; // Inject the direction locally too
      cameraPins.value.push(pin);
  

      const angle = ((pin.direction + 180) % 360 + 360) % 360;
      const cameraMarker = document.createElement('div')
      cameraMarker.style.position = 'absolute'
    
      const fovContainer = document.createElement('div')
      fovContainer.style.position = 'absolute'
      fovContainer.style.width = '0'
      fovContainer.style.height = '0'
    
      // Apply conditional logic based on direction
      if (angle >= 0 && angle < 45) {
        fovContainer.style.top = '40%';
        fovContainer.style.left = '0%';
      } else if (angle >= 45 && angle < 90) {
        fovContainer.style.top = '30%';
        fovContainer.style.left = '20%';
      } else if (angle >= 90 && angle < 135) {
        fovContainer.style.top = '20%';
        fovContainer.style.left = '60%';
      } else if (angle >= 135 && angle < 180) {
        fovContainer.style.top = '30%';
        fovContainer.style.left = '80%';
      } else if (angle >= 180 && angle < 225) {
        fovContainer.style.top = '40%';
        fovContainer.style.left = '100%';
      } else if (angle >= 225 && angle < 270) {
        fovContainer.style.top = '60%';
        fovContainer.style.left = '80%';
      } else if (angle >= 270 && angle < 300) {
        fovContainer.style.top = '100%';
        fovContainer.style.left = '50%';
      } else if (angle >= 300 && angle < 315) {
        fovContainer.style.top = '70%';
        fovContainer.style.left = '50%';
      } else {
        fovContainer.style.top = '100%';
        fovContainer.style.left = '0%';
      }
      fovContainer.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`
      fovContainer.style.transformOrigin = 'center center'
      fovContainer.style.zIndex = '0'
      
      // Create the field of view cone
      const cone = document.createElement('div')
      cone.style.position = 'absolute'
      cone.style.width = '0'
      cone.style.height = '0'
      cone.style.borderLeft = '30px solid transparent'
      cone.style.borderRight = '30px solid transparent'
      cone.style.borderBottom = '80px solid rgba(0, 34, 63, 0.3)' // transparent blue cone
      cone.style.borderBottomLeftRadius = '50%'; 
      cone.style.borderBottomRightRadius = '50%'; 
      cone.style.top = '0' // Position it to start from the center of camera
      cone.style.left = '0'
      cone.style.transformOrigin = 'center top'
      cone.style.pointerEvents = 'none' 
      
      // Add the cone to its container
      fovContainer.appendChild(cone)

      const cameraIcon = document.createElement('div');
      cameraIcon.style.position = 'relative';
      cameraIcon.style.zIndex = '1';
      // ✨ Same CCTV SVG
      cameraIcon.innerHTML = `
       <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 512 512" id="cctv">
        <defs>
          <linearGradient id="a" x1="256" x2="256" y1="507.946" y2="4.054" gradientTransform="rotate(45 256 256)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#a6d8f4"></stop>
            <stop offset="1" stop-color="#dff3fd"></stop>
          </linearGradient>
          <linearGradient id="b" x1="256" x2="256" y1="83.078" y2="428.922" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="#0068e7"></stop>
            <stop offset="1" stop-color="#26b3e8"></stop>
          </linearGradient>
        </defs>
        <circle cx="256" cy="256" r="251.946" fill="url(#a)" transform="rotate(-45 256 256)"></circle>
        <path fill="url(#b)" d="M402.511,235.596c.992,1.751,1.328,3.876,.769,5.962l-10.505,39.207c-1.13,4.217-5.506,6.743-9.723,5.613l-14.302-3.832 8.497-31.71c.463-1.727 1.52-3.038 3.111-3.855l22.154-11.384Zm-125.661-7.647l87.319,23.397-10.385,38.759c-2.177,8.125-10.606,12.991-18.731,10.814l-72.954-19.548c.134,1.203.206,2.424.206,3.663,0,14.25-9.132,26.366-21.862,30.82v9.476c0,30.086-24.617,54.703-54.702,54.703H116.797v18.416c0,5.852-4.788,10.641-10.641,10.641h-4.39v13.582c0,3.452-2.798,6.25-6.25,6.25s-6.25-2.798-6.25-6.25v-106.845c0-3.452,2.798-6.25,6.25-6.25s6.25,2.798,6.25,6.25v13.582h4.39c5.853,0,10.641,4.789,10.641,10.641v18.416h68.945c18.182,0,33.136-14.954,33.136-33.136v-9.476c-12.73-4.454-21.862-16.569-21.862-30.82,0-7.262,2.372-13.969,6.383-19.392l-64.114-17.179c-16.384-4.39-26.197-21.387-21.807-37.77l.603-2.249 132.368,35.468c1.985,.53 4.003,.041 5.497-1.145l20.905-14.817Zm-35.986,57.085c0-6.188-5.016-11.204-11.204-11.204s-11.204,5.016-11.204,11.204,5.016,11.204,11.204,11.204,11.204-5.016,11.204-11.204Zm89.612-22.704l4.709,1.262c3.33,.89 6.752-1.089 7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642l-4.709-1.262c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642Zm92.259-51.181l-54.955,28.24-90.524-24.256c-1.8-.48-3.708-.127-5.225,.952l-21.178,15.01-129.543-34.711,8.519-31.793c4.39-16.384 21.387-26.197 37.77-21.807l255.135,68.363Zm-225.203-17.378l-48.686-13.045c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642l48.686,13.045c3.33,.89,6.752-1.089,7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642Zm81.774-45.086c0,7.832 6.35,14.182 14.182,14.182s14.182-6.349 14.182-14.182-6.349-14.182-14.182-14.182-14.182,6.349-14.182,14.182Zm-33.378-32.394c2.672,2.178 6.608,1.774 8.789-.902 10.396-12.775 24.16-19.811 38.772-19.811s28.376,7.036 38.765,19.811c1.236,1.517 3.044,2.305 4.854,2.305 1.39,0 2.786-.458 3.939-1.403 2.679-2.178 3.083-6.113 .909-8.793-12.812-15.748-30.03-24.421-48.467-24.421s-35.652,8.672-48.467,24.421c-2.178,2.679-1.777,6.615 .905,8.793Zm71.875,16.86c1.236,1.52 3.033,2.309 4.854,2.309 1.39,0 2.779-.461 3.939-1.403 2.679-2.178 3.083-6.114 .902-8.793-8.967-11.024-21.043-17.094-34.008-17.094s-25.049,6.073-34.015,17.094c-2.178,2.679-1.771,6.614 .902,8.793,2.683,2.178 6.621,1.774 8.793-.905,6.551-8.048,15.187-12.481,24.32-12.481s17.766,4.433,24.314,12.481Z"></path>
      </svg>
      `;

      cameraMarker.appendChild(fovContainer)
      cameraMarker.appendChild(cameraIcon);
  
      new mapboxgl.Marker({
        element: cameraMarker,
        anchor: 'bottom',
      })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: [0, -30], anchor: 'bottom' })
            .setHTML(`
              <div style="
                font-family: 'Segoe UI', sans-serif;
                min-width: 200px;
                padding: 12px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.15);
              ">
                <h3 style="
                  margin: 0 0 6px;
                  font-size: 16px;
                  color: #00223f;
                ">
                  ${pin.camera_name}
                </h3>
                <p style="
                  margin: 0 0 12px;
                  font-size: 14px;
                  color: #555;
                ">
                  ${pin.camera_description}
                </p>
                <button 
                  onclick="deleteCameraPin('${pin.id}')"
                  style="
                    padding: 6px 12px;
                    font-size: 13px;
                    background-color: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                  "
                >
                  Delete
                </button>
              </div>
            `)
        )
        
        .addTo(mapInstance.value);
  
      selectedLocation.value = null;
    } catch (error) {
      console.error('❌ Failed to save pin:', error);
    }
  };
  
  const cancelAddPinMode = () => {
    isAddPinMode.value = false
    if (mapInstance.value) {
      mapInstance.value.getCanvas().style.cursor = ''
    }
  }

  const fetchCameraPins = async (userMapId: number) => { // 🛠 Accept mapId dynamically
    try {
      if (!userMapId) {
        console.warn('No userMapId provided to fetchCameraPins')
        return
      }

      const response = await axios.get('/camera-pins', {
        params: { user_map_id: userMapId }
      })

      console.log('📡 Pins Fetched:', response.data)

      const pins = Array.isArray(response.data) ? response.data : response.data.pins ?? []
      cameraPins.value = pins
      displayCameraPins()
    } catch (error) {
      console.error('❌ Failed to fetch pins:', error)
      cameraPins.value = []
    }
  }


  const displayCameraPins = () => {
    if (!mapInstance.value) {
      console.warn('⚠️ Map not ready')
      return
    }
  
    console.log('📍 Displaying pins:', cameraPins.value)
  
    cameraPins.value.forEach(pin => {
      const angle = ((pin.direction + 180) % 360 + 360) % 360;

      console.log('📍 Pin Angle:', angle)
      const cameraMarker = document.createElement('div')
      cameraMarker.style.position = 'absolute'
    
      const fovContainer = document.createElement('div')
      fovContainer.style.position = 'absolute'
      fovContainer.style.width = '0'
      fovContainer.style.height = '0'
    
      // Apply conditional logic based on direction
      if (angle >= 0 && angle < 45) {
        fovContainer.style.top = '40%';
        fovContainer.style.left = '0%';
      } else if (angle >= 45 && angle < 90) {
        fovContainer.style.top = '30%';
        fovContainer.style.left = '20%';
      } else if (angle >= 90 && angle < 135) {
        fovContainer.style.top = '20%';
        fovContainer.style.left = '60%';
      } else if (angle >= 135 && angle < 180) {
        fovContainer.style.top = '30%';
        fovContainer.style.left = '80%';
      } else if (angle >= 180 && angle < 225) {
        fovContainer.style.top = '40%';
        fovContainer.style.left = '100%';
      } else if (angle >= 225 && angle < 270) {
        fovContainer.style.top = '60%';
        fovContainer.style.left = '80%';
      } else if (angle >= 270 && angle < 300) {
        fovContainer.style.top = '100%';
        fovContainer.style.left = '50%';
      } else if (angle >= 300 && angle < 315) {
        fovContainer.style.top = '70%';
        fovContainer.style.left = '50%';
      } else {
        fovContainer.style.top = '100%';
        fovContainer.style.left = '0%';
      }
    
      fovContainer.style.transform = `translate(-50%, -50%) rotate(${angle}deg)`
      fovContainer.style.transformOrigin = 'center center'
      fovContainer.style.zIndex = '0'
      
      // Create the field of view cone
      const cone = document.createElement('div')
      cone.style.position = 'absolute'
      cone.style.width = '0'
      cone.style.height = '0'
      cone.style.borderLeft = '30px solid transparent'
      cone.style.borderRight = '30px solid transparent'
      cone.style.borderBottom = '80px solid rgba(0, 34, 63, 0.3)' // transparent blue cone
      cone.style.borderBottomLeftRadius = '50%'; 
      cone.style.borderBottomRightRadius = '50%'; 
      cone.style.top = '0' // Position it to start from the center of camera
      cone.style.left = '0'
      cone.style.transformOrigin = 'center top'
      cone.style.pointerEvents = 'none' // So clicks go through
      
      // Add the cone to its container
      fovContainer.appendChild(cone)
  
      // Create the camera icon
      const cameraIcon = document.createElement('div')
      cameraIcon.style.position = 'relative'
      cameraIcon.style.zIndex = '1' // Above the cone
      cameraIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 512 512" id="cctv">
          <defs>
            <linearGradient id="a" x1="256" x2="256" y1="507.946" y2="4.054" gradientTransform="rotate(45 256 256)" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#a6d8f4"></stop>
              <stop offset="1" stop-color="#dff3fd"></stop>
            </linearGradient>
            <linearGradient id="b" x1="256" x2="256" y1="83.078" y2="428.922" gradientUnits="userSpaceOnUse">
              <stop offset="0" stop-color="#0068e7"></stop>
              <stop offset="1" stop-color="#26b3e8"></stop>
            </linearGradient>
          </defs>
          <circle cx="256" cy="256" r="251.946" fill="url(#a)" transform="rotate(-45 256 256)"></circle>
          <path fill="url(#b)" d="M402.511,235.596c.992,1.751,1.328,3.876,.769,5.962l-10.505,39.207c-1.13,4.217-5.506,6.743-9.723,5.613l-14.302-3.832 8.497-31.71c.463-1.727 1.52-3.038 3.111-3.855l22.154-11.384Zm-125.661-7.647l87.319,23.397-10.385,38.759c-2.177,8.125-10.606,12.991-18.731,10.814l-72.954-19.548c.134,1.203.206,2.424.206,3.663,0,14.25-9.132,26.366-21.862,30.82v9.476c0,30.086-24.617,54.703-54.702,54.703H116.797v18.416c0,5.852-4.788,10.641-10.641,10.641h-4.39v13.582c0,3.452-2.798,6.25-6.25,6.25s-6.25-2.798-6.25-6.25v-106.845c0-3.452,2.798-6.25,6.25-6.25s6.25,2.798,6.25,6.25v13.582h4.39c5.853,0,10.641,4.789,10.641,10.641v18.416h68.945c18.182,0,33.136-14.954,33.136-33.136v-9.476c-12.73-4.454-21.862-16.569-21.862-30.82,0-7.262,2.372-13.969,6.383-19.392l-64.114-17.179c-16.384-4.39-26.197-21.387-21.807-37.77l.603-2.249 132.368,35.468c1.985,.53 4.003,.041 5.497-1.145l20.905-14.817Zm-35.986,57.085c0-6.188-5.016-11.204-11.204-11.204s-11.204,5.016-11.204,11.204,5.016,11.204,11.204,11.204,11.204-5.016,11.204-11.204Zm89.612-22.704l4.709,1.262c3.33,.89 6.752-1.089 7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642l-4.709-1.262c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642Zm92.259-51.181l-54.955,28.24-90.524-24.256c-1.8-.48-3.708-.127-5.225,.952l-21.178,15.01-129.543-34.711,8.519-31.793c4.39-16.384 21.387-26.197 37.77-21.807l255.135,68.363Zm-225.203-17.378l-48.686-13.045c-3.33-.89-6.752,1.089-7.642,4.419-.89,3.33,1.089,6.752,4.419,7.642l48.686,13.045c3.33,.89,6.752-1.089,7.642-4.419,.89-3.33-1.089-6.752-4.419-7.642Zm81.774-45.086c0,7.832 6.35,14.182 14.182,14.182s14.182-6.349 14.182-14.182-6.349-14.182-14.182-14.182-14.182,6.349-14.182,14.182Zm-33.378-32.394c2.672,2.178 6.608,1.774 8.789-.902 10.396-12.775 24.16-19.811 38.772-19.811s28.376,7.036 38.765,19.811c1.236,1.517 3.044,2.305 4.854,2.305 1.39,0 2.786-.458 3.939-1.403 2.679-2.178 3.083-6.113 .909-8.793-12.812-15.748-30.03-24.421-48.467-24.421s-35.652,8.672-48.467,24.421c-2.178,2.679-1.777,6.615 .905,8.793Zm71.875,16.86c1.236,1.52 3.033,2.309 4.854,2.309 1.39,0 2.779-.461 3.939-1.403 2.679-2.178 3.083-6.114 .902-8.793-8.967-11.024-21.043-17.094-34.008-17.094s-25.049,6.073-34.015,17.094c-2.178,2.679-1.771,6.614 .902,8.793,2.683,2.178 6.621,1.774 8.793-.905,6.551-8.048,15.187-12.481,24.32-12.481s17.766,4.433,24.314,12.481Z"></path>
        </svg>
      `
      
      // Add both elements to the marker in the right order
      cameraMarker.appendChild(fovContainer)
      cameraMarker.appendChild(cameraIcon)
      
      // Create and add the marker to the map
      new mapboxgl.Marker({
        element: cameraMarker,
        anchor: 'center' // Changed from 'bottom' to 'center' for better positioning
      })
        .setLngLat([pin.longitude, pin.latitude])
        .setPopup(
          new mapboxgl.Popup({ offset: [0, -30], anchor: 'bottom' })
            .setHTML(`
              <div class="popup-content" style="
                font-family: 'Segoe UI', sans-serif;
                min-width: 200px;
                padding: 12px;
                background-color: #fff;
                border-radius: 8px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.15);
              ">
                <h3 style="
                  margin: 0 0 6px;
                  font-size: 16px;
                  color: #00223f;
                ">
                  ${pin.camera_name}
                </h3>
                <p style="
                  margin: 0 0 12px;
                  font-size: 14px;
                  color: #555;
                ">
                  ${pin.camera_description}
                </p>
                <button 
                  onclick="deleteCameraPin('${pin.id}')"
                  style="
                    padding: 6px 12px;
                    font-size: 13px;
                    background-color: #e74c3c;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                  "
                >
                  Delete
                </button>
              </div>
            `)
        )
        
        .addTo(mapInstance.value)
    })
  }
  (window as any).deleteCameraPin = async (pinId: string) => {
    try {
      await axios.delete(`/camera-pins/${pinId}`)
      cameraPins.value = cameraPins.value.filter(pin => pin.id !== pinId)
      displayCameraPins()
    } catch (error) {
      console.error('❌ Failed to delete pin:', error)
    }
  }

  return {
    isAddPinMode,
    cameraPins,
    enableAddPinMode,
    saveCameraPin,
    cancelAddPinMode,
    fetchCameraPins,
    displayCameraPins,
    onPinLocationSelected, // ✅ expose this
    markerRefs
  }
}
