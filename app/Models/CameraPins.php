<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class CameraPins extends Model
{

    protected $fillable = [
        'camera_name',
        'hls_url',
        'camera_description',
        'latitude',
        'longitude',
        'direction',
        'user_map_id',
        'image_link'
    ];
    protected $casts = [
        'latitude' => 'float',
        'longitude' => 'float',
    ];
    protected $hidden = [
        'created_at',
        'updated_at',
    ];

    public function userMap()
    {
        return $this->belongsTo(UserMap::class, 'user_map_id');
    }

}
