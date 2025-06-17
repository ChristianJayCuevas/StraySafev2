<?php

namespace App\Http\Controllers\API;
use Illuminate\Support\Facades\Auth;
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
        $animals = RegisteredAnimal::where('id', $user->id) // <<< KEY CHANGE HERE
            ->select('id', 'owner', 'contact', 'animal_type', 'pictures', 'status', 'created_at', 'updated_at', 'breed', 'pet_name')
            ->orderBy('created_at', 'desc') // Optional: show newest first
            ->get();

        return response()->json([
            'status' => 'success',
            'data' => $animals,
        ]);
    }

    public function fetchRegisteredAnimals()
    {
        $animals = RegisteredAnimal::select('id', 'user_id', 'owner', 'contact', 'animal_type', 'pictures', 'status', 'created_at', 'updated_at', 'breed', 'pet_name')->get();

        // The 'picture' field now contains the Base64 string directly.
        // The frontend will need to use it in a data URI: src="data:image/jpeg;base64,{{ base64String }}"
        return response()->json([
            'status' => 'success',
            'data' => $animals, // 'picture' field will have the Base64 string
        ]);
    }

     public function storeRegisteredAnimal(Request $request)
    {
        // STEP 1: VALIDATE THE INCOMING DATA
        $validator = Validator::make($request->all(), [
            'pet_name'    => 'required|string|max:255',
            'animal_type' => 'required|in:dog,cat,Dog,Cat,DOG,CAT',
            'breed'       => 'nullable|string|max:255',
            'contact'     => 'required|string|max:255',
            // Validate that 'pictures' is an array and each item is an image
            'pictures'    => 'required|array|min:1',
            'pictures.*'  => 'required|image|mimes:jpeg,png,jpg,gif|max:2048', // 2MB max per image
        ]);

        if ($validator->fails()) {
            return response()->json([
                'status' => 'error',
                'errors' => $validator->errors(),
            ], 422);
        }

        // STEP 2: HANDLE FILE UPLOADS
        $picturePaths = [];
        if ($request->hasFile('pictures')) {
            foreach ($request->file('pictures') as $file) {
                // Store the file in `storage/app/public/pet_pictures`
                // The `store` method returns the path of the saved file
                $path = $file->store('pet_pictures', 'public');
                $picturePaths[] = $path;
            }
        }

        // STEP 3: CREATE THE DATABASE RECORD
        $animal = RegisteredAnimal::create([
            'user_id'     => Auth::id(),
            'owner'       => $request->user() ? $request->user()->name : 'Unknown Owner',
            'pet_name'    => $request->pet_name,
            'animal_type' => strtolower($request->animal_type),
            'breed'       => $request->breed,
            'contact'     => $request->contact,
            'status'      => $request->status ?? 'active',
            'pictures'    => $picturePaths, // Save the array of paths
        ]);

        // When retrieving, Eloquent will automatically convert this JSON back to an array.
        // To get the full URL in the frontend, you'd prepend your app URL + '/storage/'.
        // e.g., 'http://yourapp.com/storage/pet_pictures/xxxxxxxx.jpg'

        return redirect()->back()->with('success', 'Animal registered successfully.');
    }
}