<?php

use App\Http\Controllers\Controller;
use App\Models\AnimalDetection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator; // Import Validator

class AnimalDetectionController extends Controller
{
    /**
     * Display a listing of the resource.
     */
    public function index()
    {
        // Retrieve all detections, newest first, paginated
        $detections = AnimalDetection::latest('detected_at')->paginate(15); // Sort by parsed timestamp
        return response()->json($detections);
    }

    /**
     * Store a newly created resource in storage.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'breed' => 'nullable|string|max:255',
            'contact_number' => 'nullable|string|max:50',
            'frame_base64' => 'nullable|string', // Consider max size validation if needed
            'has_leash' => 'nullable|boolean',
            'is_registered' => 'nullable|boolean',
            'leash_color' => 'nullable|string|max:50',
            'pet_name' => 'nullable|string|max:255',
            'pet_type' => 'nullable|string|max:50',
            'reg_base64' => 'nullable|string', // Consider max size validation
            'timestamp' => 'required|string|max:100', // This will be mapped to frontend_timestamp_str
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();

        // Map frontend 'timestamp' to 'frontend_timestamp_str' for the model
        $dataToCreate = $validatedData;
        if (isset($validatedData['timestamp'])) {
            $dataToCreate['frontend_timestamp_str'] = $validatedData['timestamp'];
            unset($dataToCreate['timestamp']); // Remove original 'timestamp' key if not a direct DB field
        }


        try {
            $detection = AnimalDetection::create($dataToCreate);
            return response()->json($detection, 201);
        } catch (\Exception $e) {
            // Log::error('Error saving detection: ' . $e->getMessage());
            return response()->json(['message' => 'Error saving detection data.'], 500);
        }
    }

    /**
     * Display the specified resource.
     */
    public function show(AnimalDetection $animalDetection) // Uses Route Model Binding
    {
        return response()->json($animalDetection);
    }


    /**
     * Remove the specified resource from storage.
     */
    public function destroy(AnimalDetection $animalDetection) // Uses Route Model Binding
    {
        try {
            $animalDetection->delete();
            return response()->json(null, 204); // 204 No Content
        } catch (\Exception $e) {
            // Log::error('Error deleting detection: ' . $e->getMessage());
            return response()->json(['message' => 'Error deleting detection data.'], 500);
        }
    }
}