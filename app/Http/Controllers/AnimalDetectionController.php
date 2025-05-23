<?php

namespace App\Http\Controllers;

use App\Models\AnimalDetection;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class AnimalDetectionController extends Controller
{
    private const BASE_STORAGE_PATH = '/var/www/straysafesnapshots/';

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
            'pet_type' => 'nullable|string|max:50',
            'reg_base64' => 'nullable|string',
            'rtsp_url' => 'nullable|string|max:500',
            'track_id' => 'nullable|string|max:100',
            'stable_class' => 'nullable|string|max:50',
            'detection_timestamp' => 'nullable|date',
            'similarity_score' => 'nullable|numeric|between:0,1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $validatedData = $validator->validated();
        $now = Carbon::now();

        // Convert ISO timestamp to Carbon instance if provided
        if (isset($validatedData['detection_timestamp'])) {
            $validatedData['detection_timestamp'] = Carbon::parse($validatedData['detection_timestamp']);
        }

        try {
            $detection = AnimalDetection::firstOrNew(
                [
                    'external_api_id' => $validatedData['external_api_id'],
                    'external_api_type' => $validatedData['external_api_type'],
                ]
            );

            // Save base64 images before populating the model
            $imagePaths = $this->saveBase64Images($validatedData, $now);
            
            // Update the validated data with file paths instead of base64 data
            if (isset($imagePaths['frame_path'])) {
                $validatedData['frame_path'] = $imagePaths['frame_path'];
                unset($validatedData['frame_base64']); // Remove base64 data
            }
            
            if (isset($imagePaths['reg_path'])) {
                $validatedData['reg_path'] = $imagePaths['reg_path'];
                unset($validatedData['reg_base64']); // Remove base64 data
            }

            // Populate or update fields from the request
            $detection->fill($validatedData); // Fills all matching validated data

            // If it's a new record, set 'detected_at'
            if (!$detection->exists) {
                $detection->detected_at = $now;
                $message = 'New detection created.';
                $statusCode = 201;
            } else {
                $message = 'Existing detection data processed/updated.';
                $statusCode = 200;
            }

            // Always update when we last processed this external data
            $detection->external_data_updated_at = $now;
            $detection->save();

            return response()->json(['message' => $message, 'data' => $detection], $statusCode);

        } catch (\Illuminate\Database\QueryException $e) {
            Log::error('Database query error saving detection: ' . $e->getMessage(), ['data' => $validatedData]);
            if (str_contains($e->getMessage(), 'Duplicate entry')) {
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
            // Delete associated image files if they exist
            $this->deleteAssociatedImages($animalDetection);
            
            $animalDetection->delete();
            return response()->json(null, 204);
        } catch (\Exception $e) {
            Log::error('Error deleting detection: ' . $e->getMessage());
            return response()->json(['message' => 'Error deleting detection data.'], 500);
        }
    }

    /**
     * Save base64 images to the file system
     */
    private function saveBase64Images(array $data, Carbon $timestamp): array
    {
        $savedPaths = [];

        if (empty($data['rtsp_url'])) {
            return $savedPaths;
        }

        // Create folder name from RTSP URL (sanitize for filesystem)
        $folderName = $this->sanitizeForFilename($data['rtsp_url']);
        $folderPath = self::BASE_STORAGE_PATH . $folderName . '/';

        // Create directory if it doesn't exist
        if (!is_dir($folderPath)) {
            if (!mkdir($folderPath, 0755, true)) {
                Log::error('Failed to create directory: ' . $folderPath);
                throw new \Exception('Failed to create storage directory');
            }
        }

        // Save frame image if provided
        if (!empty($data['frame_base64'])) {
            $framePath = $this->saveBase64Image(
                $data['frame_base64'],
                $folderPath,
                'frame_' . $data['external_api_id'] . '_' . $timestamp->format('Y-m-d_H-i-s'),
                'jpg'
            );
            if ($framePath) {
                $savedPaths['frame_path'] = $framePath;
            }
        }

        // Save registration image if provided
        if (!empty($data['reg_base64'])) {
            $regPath = $this->saveBase64Image(
                $data['reg_base64'],
                $folderPath,
                'reg_' . $data['external_api_id'] . '_' . $timestamp->format('Y-m-d_H-i-s'),
                'jpg'
            );
            if ($regPath) {
                $savedPaths['reg_path'] = $regPath;
            }
        }

        return $savedPaths;
    }

    /**
     * Save a single base64 image to file system
     */
    private function saveBase64Image(string $base64Data, string $folderPath, string $filename, string $extension): ?string
    {
        try {
            // Remove data URL prefix if present (e.g., "data:image/jpeg;base64,")
            if (strpos($base64Data, ',') !== false) {
                $base64Data = substr($base64Data, strpos($base64Data, ',') + 1);
            }

            // Decode base64 data
            $imageData = base64_decode($base64Data);
            if ($imageData === false) {
                Log::error('Failed to decode base64 image data');
                return null;
            }

            // Create full file path
            $fullPath = $folderPath . $filename . '.' . $extension;

            // Save to file
            if (file_put_contents($fullPath, $imageData) === false) {
                Log::error('Failed to save image to: ' . $fullPath);
                return null;
            }

            // Set proper permissions
            chmod($fullPath, 0644);

            Log::info('Image saved successfully: ' . $fullPath);
            return $fullPath;

        } catch (\Exception $e) {
            Log::error('Error saving base64 image: ' . $e->getMessage());
            return null;
        }
    }

    /**
     * Sanitize string for use as filename/folder name
     */
    private function sanitizeForFilename(string $input): string
    {
        // Replace common URL characters and create a clean folder name
        $sanitized = preg_replace('/[^a-zA-Z0-9\-_.]/', '_', $input);
        $sanitized = preg_replace('/_+/', '_', $sanitized); // Remove multiple underscores
        $sanitized = trim($sanitized, '_'); // Remove leading/trailing underscores
        
        // Limit length to prevent filesystem issues
        return substr($sanitized, 0, 100);
    }

    /**
     * Delete associated image files when deleting a detection record
     */
    private function deleteAssociatedImages(AnimalDetection $detection): void
    {
        try {
            $pathsToDelete = [];
            
            if (!empty($detection->frame_path) && file_exists($detection->frame_path)) {
                $pathsToDelete[] = $detection->frame_path;
            }
            
            if (!empty($detection->reg_path) && file_exists($detection->reg_path)) {
                $pathsToDelete[] = $detection->reg_path;
            }

            foreach ($pathsToDelete as $path) {
                if (unlink($path)) {
                    Log::info('Deleted image file: ' . $path);
                } else {
                    Log::warning('Failed to delete image file: ' . $path);
                }
            }
        } catch (\Exception $e) {
            Log::error('Error deleting associated images: ' . $e->getMessage());
        }
    }
}