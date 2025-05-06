<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\AnimalPins;
use App\Models\CameraPins;

class AnimalPinSeeder extends Seeder
{
    public function run(): void
    {
        // Get all camera pins
        $cameraPins = CameraPins::all();

        // Create some test animal pins for each camera
        foreach ($cameraPins as $cameraPin) {
            // Create 2-4 random animal pins for each camera
            $numPins = rand(2, 4);
            
            for ($i = 0; $i < $numPins; $i++) {
                AnimalPins::create([
                    'animal_type' => $this->getRandomAnimalType(),
                    'stray_status' => $this->getRandomStrayStatus(),
                    'camera_pin_id' => $cameraPin->id,
                    'user_map_id' => $cameraPin->user_map_id,
                    'latitude' => $cameraPin->latitude + (rand(-50, 50) / 111320), // Random offset within ~50 meters
                    'longitude' => $cameraPin->longitude + (rand(-50, 50) / 111320),
                ]);
            }
        }
    }

    private function getRandomAnimalType(): string
    {
        $types = ['Dog', 'Cat', 'Bird', 'Other'];
        return $types[array_rand($types)];
    }

    private function getRandomStrayStatus(): string
    {
        $statuses = ['Stray', 'Owned', 'Unknown'];
        return $statuses[array_rand($statuses)];
    }
} 