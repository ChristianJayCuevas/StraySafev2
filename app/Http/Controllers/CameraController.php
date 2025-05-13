<?php

namespace App\Http\Controllers;

use App\Models\Camera;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Inertia\Inertia;

class CameraController extends Controller
{
    /**
     * Display the CCTV management page.
     */
    public function index()
    {
        return Inertia::render('Cctv/Index');
    }

    /**
     * Get all cameras.
     */
    public function getCameras()
    {
        $cameras = Camera::all();
        
        // Transform timestamps to human-readable format
        $cameras->transform(function ($camera) {
            $camera->last_updated = $camera->last_updated ? $camera->last_updated->format('Y-m-d H:i') : now()->format('Y-m-d H:i');
            return $camera;
        });
        
        return response()->json($cameras);
    }

    /**
     * Store a newly created camera.
     */
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'location' => 'required|string|max:255',
            'stream_url' => 'required|string|max:255',
            'status' => 'required|in:live,demo,offline',
            'mode' => 'required|in:highquality,lowquality',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $camera = Camera::create([
            'name' => $request->name,
            'location' => $request->location,
            'stream_url' => $request->stream_url,
            'status' => $request->status,
            'mode' => $request->mode,
            'last_updated' => now(),
        ]);

        // Format the last_updated timestamp for the response
        $camera->last_updated = $camera->last_updated->format('Y-m-d H:i');

        return response()->json([
            'message' => 'Camera created successfully',
            'camera' => $camera
        ], 201);
    }

    /**
     * Update the specified camera.
     */
    public function update(Request $request, $id)
    {
        $camera = Camera::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|required|string|max:255',
            'location' => 'sometimes|required|string|max:255',
            'stream_url' => 'sometimes|required|string|max:255',
            'status' => 'sometimes|required|in:live,demo,offline',
            'mode' => 'sometimes|required|in:highquality,lowquality',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $camera->update([
            'name' => $request->name ?? $camera->name,
            'location' => $request->location ?? $camera->location,
            'stream_url' => $request->stream_url ?? $camera->stream_url,
            'status' => $request->status ?? $camera->status,
            'mode' => $request->mode ?? $camera->mode,
            'last_updated' => now(),
        ]);

        // Format the last_updated timestamp for the response
        $camera->last_updated = $camera->last_updated->format('Y-m-d H:i');

        return response()->json([
            'message' => 'Camera updated successfully',
            'camera' => $camera
        ]);
    }

    /**
     * Update the camera status.
     */
    public function updateStatus(Request $request, $id)
    {
        $camera = Camera::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:live,demo,offline',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $camera->update([
            'status' => $request->status,
            'last_updated' => now(),
        ]);

        // Format the last_updated timestamp for the response
        $camera->last_updated = $camera->last_updated->format('Y-m-d H:i');

        return response()->json([
            'message' => 'Camera status updated successfully',
            'camera' => $camera
        ]);
    }

    /**
     * Update the camera mode.
     */
    public function updateMode(Request $request, $id)
    {
        $camera = Camera::findOrFail($id);

        $validator = Validator::make($request->all(), [
            'mode' => 'required|in:highquality,lowquality',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'message' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        $camera->update([
            'mode' => $request->mode,
            'last_updated' => now(),
        ]);

        // Format the last_updated timestamp for the response
        $camera->last_updated = $camera->last_updated->format('Y-m-d H:i');

        return response()->json([
            'message' => 'Camera mode updated successfully',
            'camera' => $camera
        ]);
    }

    /**
     * Remove the specified camera.
     */
    public function destroy($id)
    {
        $camera = Camera::findOrFail($id);
        $camera->delete();

        return response()->json([
            'message' => 'Camera deleted successfully'
        ]);
    }
}