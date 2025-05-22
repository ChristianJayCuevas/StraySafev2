<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnimalDetection extends Model
{
    use HasFactory;

    protected $fillable = [
        'external_api_id',
        'external_api_type',
        'external_data_updated_at',
        'breed',
        'contact_number',
        'frame_base64',
        'has_leash',
        'is_registered',
        'leash_color',
        'pet_name',
        'pet_type', // This is the 'pet_type' field from the external API's data itself
        'reg_base64',
        'detected_at', // Timestamp when our system first stored/detected this
    ];

    protected $casts = [
        'has_leash' => 'boolean',
        'is_registered' => 'boolean',
        'detected_at' => 'datetime',
        'external_data_updated_at' => 'datetime',
    ];
}