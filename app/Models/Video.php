<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Video extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'title',
        'description',
        'filename',
        'path',
        'mime_type',
        'size',
        'thumbnail_path',
        'duration',
        'status',
    ];

    protected $casts = [
        'size' => 'integer',
        'duration' => 'integer',
    ];
}
