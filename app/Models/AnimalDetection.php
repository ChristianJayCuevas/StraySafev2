<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon;

class AnimalDetection extends Model
{
    use HasFactory;

    protected $fillable = [
        'external_api_id',
        'external_api_type',
        'breed',
        'contact_number',
        'frame_base64',
        'has_leash',
        'is_registered',
        'leash_color',
        'pet_name',
        'pet_type',
        'reg_base64',
        'rtsp_url',
        'track_id',
        'stable_class',
        'detection_timestamp',
        'similarity_score',
        'detected_at',
        'external_data_updated_at',
        'frame_path',
        'reg_path'
    ];

    protected $casts = [
        'has_leash' => 'boolean',
        'is_registered' => 'boolean',
        'detected_at' => 'datetime',
        'external_data_updated_at' => 'datetime',
        'detection_timestamp' => 'datetime',
        'similarity_score' => 'decimal:4',
    ];

    protected $dates = [
        'detected_at',
        'external_data_updated_at',
        'detection_timestamp',
    ];
}