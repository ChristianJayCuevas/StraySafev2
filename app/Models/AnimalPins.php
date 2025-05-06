<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AnimalPins extends Model
{
    protected $fillable = [
        'animal_type',
        'stray_status',
        'camera',
        'user_map_id',
        'camera_pin_id',
        'latitude',
        'longitude',
    ];

    protected $hidden = [
        'created_at',
        'updated_at',
    ];

    public function cameraPin()
    {
        return $this->belongsTo(CameraPins::class, 'camera_pin_id');
    }
}
