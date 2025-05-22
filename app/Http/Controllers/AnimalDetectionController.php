<?php

namespace App\Http\Controllers;

use App\Models\AnimalDetection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Carbon\Carbon;

class AnimalDetectionController extends Controller
{
    public function index(Request $request)
    {
        $perPage = $request->query('per_page', 15);
        $perPage = max(1, min(100, (int)$perPage)); // Sanitize

        // Sort by when our system first detected it, newest first
        $detections = AnimalDetection::latest('detected_at')->paginate($perPage);
        return response()->json($detections);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'external_api_id' => 'required|string|max:255',
            'external_api_type' => 'required|string|max:50',
            'breed' => 'nullable|string|max:255',
            'contact_number' => 'nullable|string|max:50',
            'frame_base64' => 'nullable|string',
            'has_leash' => 'nullable|boolean',
            'is_registered' => 'nullable|boolean',
            'leash_color' => 'nullable|string|max:50',
            'pet_name' => 'nullable|string|max:255',
            'pet_type' => 'nullable|string|max:50', // The type from external API data
            'reg_base64' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
        $now = Carbon::now();

        try {
            $detection = AnimalDetection::firstOrNew(
                [
                    'external_api_id' => $validatedData['external_api_id'],
                    'external_api_type' => $validatedData['external_api_type'],
                ]
            );

            // Populate or update fields from the request
            $detection->fill($validatedData); // Fills all matching validated data

            // If it's a new record, set 'detected_at'
            if (!$detection->exists) {
                $detection->detected_at = $now;
                $message = 'New detection created.';
                $statusCode = 201;
            } else {
                // Optionally, you could compare $detection->getOriginal() with $validatedData
                // to see if any actual data changed before deciding to save.
                // For simplicity, we'll assume if it exists, we might be updating its details.
                $message = 'Existing detection data processed/updated.';
                $statusCode = 200;
            }

            // Always update when we last processed this external data
            $detection->external_data_updated_at = $now;
            $detection->save();

            return response()->json(['message' => $message, 'data' => $detection], $statusCode);

        } catch (\Illuminate\Database\QueryException $e) {
            // This might catch race conditions if firstOrNew + save isn't atomic enough for very high concurrency
            // The unique constraint should prevent duplicates.
            Log::error('Database query error saving detection: ' . $e->getMessage(), ['data' => $validatedData]);
            if (str_contains($e->getMessage(), 'Duplicate entry')) { // Check for unique constraint violation
                 return response()->json(['message' => 'Error: Duplicate entry based on external ID and type (race condition likely).'], 409);
            }
            return response()->json(['message' => 'Error saving detection data due to database issue.'], 500);
        } catch (\Exception $e) {
            Log::error('General error saving detection: ' . $e->getMessage(), ['data' => $validatedData]);
            return response()->json(['message' => 'An unexpected error occurred while saving detection data.'], 500);
        }
    }

    public function show(AnimalDetection $animalDetection)
    {
        return response()->json($animalDetection);
    }

    public function destroy(AnimalDetection $animalDetection)
    {
        try {
            $animalDetection->delete();
            return response()->json(null, 204);
        } catch (\Exception $e) {
            Log::error('Error deleting detection: ' . $e->getMessage());
            return response()->json(['message' => 'Error deleting detection data.'], 500);
        }
    }
}   