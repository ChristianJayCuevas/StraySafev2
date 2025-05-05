<?php

namespace App\Http\Controllers\Map;
use App\Http\Controllers\Controller;
use App\Models\AnimalPins;
use Illuminate\Http\Request;

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
        $validated = $request->validate([
            'animal_type' => 'required|string|max:255',
            'stray_status' => 'required|string|max:255',
            'animal_name' => 'nullable|string|max:255',
            'camera_pin_id' => 'required|exists:camera_pins,id',
            'user_map_id' => 'required|exists:user_maps,id',
            'latitude' => 'required|numeric',
            'longitude' => 'required|numeric',
        ]);

        $pin = AnimalPins::create($validated);

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
