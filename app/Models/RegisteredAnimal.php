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
        'pictures',
        'collar',
        'status',
        'breed',
        'pet_name'
    ];
    protected $casts = [
        'pictures' => 'array', // This is crucial!
    ];
     public function user()
    {
        return $this->belongsTo(User::class);
    }
}
