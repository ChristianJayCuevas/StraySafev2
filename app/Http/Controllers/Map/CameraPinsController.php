<?php

namespace App\Http\Controllers\Map;

use App\Http\Controllers\Controller;
use App\Models\CameraPins;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
class CameraPinsController extends Controller
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

        $pins = CameraPins::where('user_map_id', $userMapId)->get();

        return response()->json($pins); // or ['pins' => $pins]
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
    $validated = $request->validate([
        'camera_name' => 'nullable|string|max:255',
        'hls_url' => 'nullable|string|max:255',
        'camera_description' => 'nullable|string',
        'latitude' => 'required|numeric',
        'longitude' => 'required|numeric',
        'direction' => 'required|numeric',
        'user_map_id' => 'nullable|exists:user_maps,id'
    ]);

    $pin = \App\Models\CameraPins::create($validated);

    return response()->json(['success' => true, 'pin' => $pin]);
}


    /**
     * Display the specified resource.
     */
    public function show(CameraPins $cameraPins)
    {
        //
    }

    /**
     * Show the form for editing the specified resource.
     */
    public function edit(CameraPins $cameraPins)
    {
        //
    }

    /**
     * Update the specified resource in storage.
     */
    public function update(Request $request, CameraPins $cameraPins)
    {
        //
    }

    /**
     * Remove the specified resource from storage.
     */
    public function destroy($id)
    {
        try {
            Log::info('Camera pin deletion request received', ['id' => $id]);
            
            // Find the pin by ID, ensuring it's a camera pin
            $pin = CameraPins::where('id', $id)
                ->first();
                
            if (!$pin) {
                Log::warning('Camera pin not found or not a camera', ['id' => $id]);
                return response()->json([
                    'success' => false,
                    'message' => 'Camera pin not found'
                ], 404);
            }
            
            // Delete the pin
            $pin->delete();
            
            Log::info('Camera pin deleted successfully', ['id' => $id]);
            return response()->json([
                'success' => true,
                'message' => 'Camera pin deleted successfully'
            ]);
            
        } catch (\Exception $e) {
            Log::error('Failed to delete camera pin', [
                'id' => $id,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString()
            ]);
            
            return response()->json([
                'success' => false,
                'message' => 'Failed to delete camera pin: ' . $e->getMessage()
            ], 500);
        }
    }
}
