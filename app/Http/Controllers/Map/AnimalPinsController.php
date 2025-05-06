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

    public function store(Request $request)
    {   
        Log::debug('Request received:', ['request' => $request->all()]);
        
        // Validate the request
        $validated = $request->validate([
            'animal_type' => 'required|string|max:255',
            'stray_status' => 'required|string|max:255',
            'camera' => 'nullable|string|max:255',
        ]);
        
        Log::debug('Validated data:', ['validated' => $validated]);
        
        $animalData = [
            'animal_type' => $validated['animal_type'],
            'stray_status' => $validated['stray_status'],
        ];
        
        // Check if camera is provided
        if (!empty($validated['camera'])) {
            Log::debug('Camera provided:', ['camera' => $validated['camera']]);
            
            $camera = CameraPins::where('camera_name', $validated['camera'])->first();
            
            // Log camera details if found
            if ($camera) {
                Log::debug('Camera found:', ['camera' => $camera->toArray()]);
            } else {
                Log::error('Camera not found with name: ' . $validated['camera']);
                return response()->json(['success' => false, 'message' => 'Camera not found.'], 404);
            }
        
            // Project animal pin in the direction of the camera
            $distance = 5; // Distance in meters from the camera
            $earthRadius = 6378137; // Radius of Earth in meters
        
            $angleRad = deg2rad($camera->direction); // Convert to radians
            Log::debug('Camera direction (radians):', ['angleRad' => $angleRad]);
        
            // Original lat/lng in radians
            $latRad = deg2rad($camera->latitude);
            $lngRad = deg2rad($camera->longitude);
            Log::debug('Camera coordinates (lat, lng in radians):', ['latRad' => $latRad, 'lngRad' => $lngRad]);
        
            // New lat/lng using equirectangular approximation
            $animalLat = rad2deg(asin(sin($latRad) * cos($distance / $earthRadius) +
                        cos($latRad) * sin($distance / $earthRadius) * cos($angleRad)));
            Log::debug('Calculated animal latitude:', ['animalLat' => $animalLat]);
        
            $animalLng = rad2deg($lngRad + atan2(
                sin($angleRad) * sin($distance / $earthRadius) * cos($latRad),
                cos($distance / $earthRadius) - sin($latRad) * sin(deg2rad($animalLat))
            ));
            Log::debug('Calculated animal longitude:', ['animalLng' => $animalLng]);
        
            $animalData['camera_pin_id'] = $camera->id;
            $animalData['user_map_id'] = $camera->user_map_id;
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
