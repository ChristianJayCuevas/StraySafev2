<?php

namespace App\Http\Controllers\Map;
use App\Http\Controllers\Controller;
use App\Models\AnimalPins;
use Illuminate\Http\Request;
use App\Models\CameraPins; 
use Illuminate\Support\Facades\Log;
class AnimalPinsController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index(Request $request)
    {
        $userMapId = $request->query('user_map_id');

        if (!$userMapId) {
            return response()->json(['error' => 'Missing user_map_id'], 400);
        }

        $pins = AnimalPins::where('user_map_id', $userMapId)->get();

        return response()->json($pins);
    }

    /**
     * Show the form for creating a new resource.
     */
    public function create()
    {
        //
    }

    /**
     * Store a newly created resource in storage.
     */

    // public function store(Request $request)
    // {   
    //     Log::debug('Request received:', ['request' => $request->all()]);
        
    //     // Validate the request
    //     $validated = $request->validate([
    //         'animal_type' => 'required|string|max:255',
    //         'stray_status' => 'required|string|max:255',
    //         'camera' => 'nullable|string|max:255',
    //     ]);
        
    //     Log::debug('Validated data:', ['validated' => $validated]);
        
    //     $animalData = [
    //         'animal_type' => $validated['animal_type'],
    //         'stray_status' => $validated['stray_status'],
    //     ];
        
    //     // Check if camera is provided
    //     if (!empty($validated['camera'])) {
    //         Log::debug('Camera provided:', ['camera' => $validated['camera']]);
            
    //         $camera = CameraPins::where('camera_name', $validated['camera'])->first();
            
    //         // Log camera details if found
    //         if ($camera) {
    //             Log::debug('Camera found:', ['camera' => $camera->toArray()]);
    //         } else {
    //             Log::error('Camera not found with name: ' . $validated['camera']);
    //             return response()->json(['success' => false, 'message' => 'Camera not found.'], 404);
    //         }
        
    //         // Project animal pin in the direction of the camera
    //         $distance = 5; // Distance in meters from the camera
    //         $earthRadius = 6378137; // Radius of Earth in meters
        
    //         $angleRad = deg2rad($camera->direction); // Convert to radians
    //         Log::debug('Camera direction (radians):', ['angleRad' => $angleRad]);
        
    //         // Original lat/lng in radians
    //         $latRad = deg2rad($camera->latitude);
    //         $lngRad = deg2rad($camera->longitude);
    //         Log::debug('Camera coordinates (lat, lng in radians):', ['latRad' => $latRad, 'lngRad' => $lngRad]);
        
    //         // New lat/lng using equirectangular approximation
    //         $animalLat = rad2deg(asin(sin($latRad) * cos($distance / $earthRadius) +
    //                     cos($latRad) * sin($distance / $earthRadius) * cos($angleRad)));
    //         Log::debug('Calculated animal latitude:', ['animalLat' => $animalLat]);
        
    //         $animalLng = rad2deg($lngRad + atan2(
    //             sin($angleRad) * sin($distance / $earthRadius) * cos($latRad),
    //             cos($distance / $earthRadius) - sin($latRad) * sin(deg2rad($animalLat))
    //         ));
    //         Log::debug('Calculated animal longitude:', ['animalLng' => $animalLng]);
        
    //         $animalData['camera_pin_id'] = $camera->id;
    //         $animalData['user_map_id'] = $camera->user_map_id;
    //         $animalData['latitude'] = $animalLat;
    //         $animalData['longitude'] = $animalLng;
    //     } else {
    //         Log::debug('No camera provided in the request.');
    //     }
        
    //     // Create the animal pin
    //     $pin = AnimalPins::create($animalData);
    //     Log::debug('Animal pin created:', ['pin' => $pin->toArray()]);
        
    //     return response()->json(['success' => true, 'pin' => $pin]);
    // }

    public function store(Request $request)
    {   
        Log::debug('Request received:', ['request' => $request->all()]);
        
        // Validate the request
        $validated = $request->validate([
            'animal_type' => 'required|string|max:255',
            'stray_status' => 'required|string|max:255',
            'camera' => 'nullable|string|max:255', // Changed from 'stream_id' to 'camera'
            'detection_id' => 'required|string|max:255'
        ]);
        
        Log::debug('Validated data:', ['validated' => $validated]);
        
        $animalData = [
            'animal_type' => $validated['animal_type'],
            'stray_status' => $validated['stray_status'],
            'camera' => $validated['camera'],
            'detection_id' => $validated['detection_id']
        ];
        
        // Check if camera is provided
        if (!empty($validated['camera'])) {
            $cameraId = $validated['camera'];
            Log::debug('Camera identifier provided:', ['camera' => $cameraId]);
            
            // Find camera by matching the identifier in the HLS URL
            $camera = CameraPins::where('hls_url', 'LIKE', "%{$cameraId}%")->first();
            
            if ($camera) {
                Log::debug('Camera found:', ['camera' => $camera->toArray()]);
            } else {
                Log::error('Camera not found with identifier in HLS URL: ' . $cameraId);
                return response()->json(['success' => false, 'message' => 'Camera not found.'], 404);
            }
        
            $animalData['camera_pin_id'] = $camera->id;
            $animalData['user_map_id'] = $camera->user_map_id;
            
            // Get existing pins for this camera
            $existingPins = AnimalPins::where('camera_pin_id', $camera->id)->get();
            
            // Base distance and angle values
            $baseDistance = 5; // Initial distance in meters from the camera
            $cameraAngleRad = deg2rad($camera->direction); // Camera direction in radians
            
            if ($existingPins->count() > 0) {
                // Calculate new position based on existing pins
                list($animalLat, $animalLng) = $this->calculateNewPinPosition($camera, $existingPins, $baseDistance, $cameraAngleRad);
            } else {
                // No existing pins, place first pin at base distance and camera direction
                list($animalLat, $animalLng) = $this->calculatePinPosition($camera->latitude, $camera->longitude, $baseDistance, $cameraAngleRad);
            }
            
            Log::debug('Final animal coordinates:', ['animalLat' => $animalLat, 'animalLng' => $animalLng]);
            
            $animalData['latitude'] = $animalLat;
            $animalData['longitude'] = $animalLng;
        } else {
            Log::debug('No camera provided in the request.');
        }
        
        // Create the animal pin
        $pin = AnimalPins::create($animalData);
        Log::debug('Animal pin created:', ['pin' => $pin->toArray()]);
        
        return response()->json(['success' => true, 'pin' => $pin]);
    }
    

/**
 * Calculate a new pin position based on existing pins
 * 
 * @param CameraPins $camera The camera pin object
 * @param Collection $existingPins Collection of existing animal pins
 * @param float $baseDistance Base distance from camera in meters
 * @param float $cameraAngleRad Camera direction in radians
 * @return array Array containing [latitude, longitude]
 */
private function calculateNewPinPosition($camera, $existingPins, $baseDistance, $cameraAngleRad)
{
    // Field of view constants (adjustable)
    $fieldOfView = 60; // Camera cone angle in degrees
    $maxDistance = 25; // Maximum distance from camera in meters
    
    // Earth radius in meters
    $earthRadius = 6378137;
    
    // Convert field of view to radians
    $fovRad = deg2rad($fieldOfView);
    
    // Get count of existing pins to determine distribution
    $pinCount = $existingPins->count();
    
    // Generate potential positions using a spiral pattern
    $attempts = 0;
    $maxAttempts = 20; // Prevent infinite loops
    $minSeparation = 2; // Minimum distance between pins in meters
    
    // Calculate camera's position in radians
    $camLatRad = deg2rad($camera->latitude);
    $camLngRad = deg2rad($camera->longitude);
    
    while ($attempts < $maxAttempts) {
        // Calculate distance variation (increases with more pins)
        $distanceVariation = min(($pinCount * 2), ($maxDistance - $baseDistance));
        $distance = $baseDistance + ($distanceVariation * (0.3 + (0.7 * $attempts / $maxAttempts)));
        
        // Calculate angle variation within the field of view
        $angleOffset = ($fovRad * 0.8) * (($attempts % 2) ? -1 : 1) * ($attempts / $maxAttempts);
        $angle = $cameraAngleRad + $angleOffset;
        
        // Calculate new position
        list($newLat, $newLng) = $this->calculatePinPosition($camera->latitude, $camera->longitude, $distance, $angle);
        
        // Check if this position is far enough from existing pins
        $isFarEnough = true;
        foreach ($existingPins as $existingPin) {
            $distance = $this->haversineDistance(
                $newLat, $newLng,
                $existingPin->latitude, $existingPin->longitude
            );
            
            if ($distance < $minSeparation) {
                $isFarEnough = false;
                break;
            }
        }
        
        if ($isFarEnough) {
            return [$newLat, $newLng];
        }
        
        $attempts++;
    }
    
    // If all attempts fail, use a random position within the cone as fallback
    $randomDistance = $baseDistance + (rand(0, 10) / 10) * ($maxDistance - $baseDistance);
    $randomAngle = $cameraAngleRad + (rand(-80, 80) / 100) * ($fovRad / 2);
    
    return $this->calculatePinPosition($camera->latitude, $camera->longitude, $randomDistance, $randomAngle);
}

/**
 * Calculate pin position at given distance and angle from origin
 * 
 * @param float $originLat Origin latitude in degrees
 * @param float $originLng Origin longitude in degrees
 * @param float $distance Distance in meters
 * @param float $angleRad Direction in radians
 * @return array Array containing [latitude, longitude]
 */
private function calculatePinPosition($originLat, $originLng, $distance, $angleRad)
{
    $earthRadius = 6378137; // Radius of Earth in meters
    
    // Convert origin to radians
    $latRad = deg2rad($originLat);
    $lngRad = deg2rad($originLng);
    
    // Calculate new position
    $newLat = rad2deg(asin(sin($latRad) * cos($distance / $earthRadius) +
                cos($latRad) * sin($distance / $earthRadius) * cos($angleRad)));
    
    $newLng = rad2deg($lngRad + atan2(
        sin($angleRad) * sin($distance / $earthRadius) * cos($latRad),
        cos($distance / $earthRadius) - sin($latRad) * sin(deg2rad($newLat))
    ));
    
    return [$newLat, $newLng];
}

/**
 * Calculate distance between two coordinates using Haversine formula
 * 
 * @param float $lat1 First latitude in degrees
 * @param float $lng1 First longitude in degrees
 * @param float $lat2 Second latitude in degrees
 * @param float $lng2 Second longitude in degrees
 * @return float Distance in meters
 */
private function haversineDistance($lat1, $lng1, $lat2, $lng2)
{
    $earthRadius = 6378137; // Radius of Earth in meters
    
    // Convert to radians
    $lat1Rad = deg2rad($lat1);
    $lng1Rad = deg2rad($lng1);
    $lat2Rad = deg2rad($lat2);
    $lng2Rad = deg2rad($lng2);
    
    // Calculate differences
    $latDiff = $lat2Rad - $lat1Rad;
    $lngDiff = $lng2Rad - $lng1Rad;
    
    // Haversine formula
    $a = sin($latDiff / 2) * sin($latDiff / 2) +
         cos($lat1Rad) * cos($lat2Rad) *
         sin($lngDiff / 2) * sin($lngDiff / 2);
    $c = 2 * atan2(sqrt($a), sqrt(1 - $a));
    
    return $earthRadius * $c;
}
    
    /**
     * Display the specified resource.
     */
    public function show(AnimalPins $animalPins)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(AnimalPins $animalPins)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, AnimalPins $animalPins)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AnimalPins $animalPin)
    {
        $animalPin->delete();
        return response()->json(['success' => true]);
    }
}
