<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class RegisteredAnimal extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'owner',
        'contact',
        'animal_type',
        'picture',
        'status',
        'breed',
        'pet_name'
    ];
     public function user()
    {
        return $this->belongsTo(User::class);
    }
}
