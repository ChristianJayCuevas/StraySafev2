<?php

namespace App\Http\Controllers;

use App\Models\CameraPins;
use App\Models\AnimalPins;
use App\Models\UserArea;
use App\Models\RegisteredAnimal;
class DashboardController extends Controller
{
    public function summary()
    {
        return response()->json([
            'camera_pins' => CameraPins::count(),
            'animal_pins' => AnimalPins::count(),
            'total_area' => UserArea::count(), // or calculate hectares, etc.
            'registered_animal' => RegisteredAnimal::count()
        ]);
    }

    public function summary2()
    {
        $dogCount = AnimalPins::where('animal_type', 'dog')->count();
        $catCount = AnimalPins::where('animal_type', 'cat')->count();
        $animalCount = $dogCount + $catCount;
        return response()->json([
            'animal_pins' => $animalCount,
            'dog_pins' => $dogCount,
            'cat_pins' => $catCount,
            
        ]);
    }
}

