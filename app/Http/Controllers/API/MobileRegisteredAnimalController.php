<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\RegisteredAnimal;
use Illuminate\Support\Facades\Validator;
// No need for Storage facade if only using Base64 for DB

class MobileRegisteredAnimalController extends Controller
{
    public function fetchMyPets(Request $request)
    {
        $user = $request->user(); // Or Auth::user();

        if (!$user) {
            return response()->json([
                'status' => 'error',
                'message' => 'Unauthenticated.',
            ], 401);
        }

        // Assuming your RegisteredAnimal model has a 'user_id' field
        // linking it to the user who registered it.
        // If your 'owner' field stores the user's ID, use where('owner', $user->id)
        // If 'owner' stores the user's name, and you want to filter by that, use where('owner', $user->name)
        // But using user_id is generally more robust.
        $animals = RegisteredAnimal::where('user_id', $user->id) // <<< KEY CHANGE HERE
            ->select('id', 'owner', 'contact', 'animal_type', 'picture', 'status', 'created_at', 'updated_at', 'breed', 'pet_name')
            ->orderBy('created_at', 'desc') // Optional: show newest first
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $animals,
        ]);
    }

    public function fetchRegisteredAnimals()
    {
        $animals = RegisteredAnimal::select('id', 'owner', 'contact', 'animal_type', 'picture', 'status', 'created_at', 'updated_at', 'breed', 'pet_name')->get();

        // The 'picture' field now contains the Base64 string directly.
        // The frontend will need to use it in a data URI: src="data:image/jpeg;base64,{{ base64String }}"
        return response()->json([
            'status' => 'success',
            'data' => $animals, // 'picture' field will have the Base64 string
        ]);
    }

    public function storeRegisteredAnimal(Request $request)
    {
        $validator = Validator::make($request->all(), [
            // 'owner' => 'required|string|max:255',
            'pet_name' => 'required|string|max:255',
            'animal_type' => 'required|in:dog,cat,Dog,Cat,DOG,CAT',
            'breed' => 'nullable|string|max:255',
            'contact' => 'required|string|max:255',
            // Now we expect 'picture' to be a Base64 encoded string from the frontend
            'picture' => 'required|string', // Or you could add a custom validation rule for Base64
            // 'status' => 'in:active,inactive',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // The request->picture is already the Base64 string sent from the frontend
        $base64Image = $request->picture;

        // You might want to extract the mime type if you need to store it separately
        // or if you want to prepend it when displaying (e.g., "data:image/jpeg;base64,")
        // For simplicity, we'll assume the frontend will handle prepending the data URI prefix.
        // If the frontend sends the full data URI, you might need to strip the prefix:
        // if (preg_match('/^data:image\/(\w+);base64,/', $base64Image, $type)) {
        //     $base64Image = substr($base64Image, strpos($base64Image, ',') + 1);
        //     $mimeType = strtolower($type[1]); // e.g., jpeg, png
        // } else {
        //     // Handle error: not a valid data URI
        //     return response()->json(['status' => 'error', 'message' => 'Invalid image format.'], 400);
        // }


        $animal = RegisteredAnimal::create([
            // 'owner' => $request->owner,
            'owner' => $request->user() ? $request->user()->name : 'Unknown Owner',
            'contact' => $request->contact,
            'animal_type' => strtolower($request->animal_type),
            'picture' => $base64Image, // Store the Base64 string directly
            'status' => $request->status ?? 'active',
            'breed' => $request->breed,
            'pet_name' => $request->pet_name,
        ]);

        return response()->json([
            'status' => 'success',
            'message' => 'Animal registered successfully.',
            'data' => $animal, // 'picture' field in $animal will have the Base64 string
        ], 201);
    }
}