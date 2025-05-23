<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RegisteredAnimal extends Model
{
    use HasFactory;

    protected $fillable = [
        'owner',
        'contact',
        'animal_type',
        'picture',
        'status',
        'breed',
        'pet_name'
    ];
}
