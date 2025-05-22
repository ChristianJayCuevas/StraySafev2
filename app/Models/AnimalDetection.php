<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Carbon\Carbon; // Import Carbon for date manipulation

class AnimalDetection extends Model
{
    use HasFactory;

    protected $table = 'animal_detections'; // Explicitly define table name (optional if convention is followed)

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'breed',
        'contact_number',
        'frame_base64',
        'has_leash',
        'is_registered',
        'leash_color',
        'pet_name',
        'pet_type',
        'reg_base64',
        'frontend_timestamp_str',
        'detected_at', // Add this if you plan to parse/store a proper timestamp
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'has_leash' => 'boolean',
        'is_registered' => 'boolean',
        'detected_at' => 'datetime', // Cast to Carbon instance when retrieved
    ];

    /**
     * Mutator to attempt parsing the frontend timestamp string.
     * You might need to adjust the parsing format based on your frontend_timestamp_str
     */
    public function setFrontendTimestampStrAttribute($value)
    {
        $this->attributes['frontend_timestamp_str'] = $value;
        try {
            // Example parsing: "May 19, 10:30 AM"
            // Carbon::parse will attempt to understand many common formats.
            // If it's very specific, you might need Carbon::createFromFormat.
            $this->attributes['detected_at'] = Carbon::parse($value);
        } catch (\Exception $e) {
            // Handle parsing error, e.g., log it or set detected_at to null
            $this->attributes['detected_at'] = null;
            // Log::error("Failed to parse frontend_timestamp_str: {$value} - " . $e->getMessage());
        }
    }
}