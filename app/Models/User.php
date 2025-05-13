<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Spatie\Permission\Traits\HasRoles;
use App\Models\UserMap;
use Illuminate\Database\Eloquent\Relations\HasMany; 
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Laravel\Sanctum\HasApiTokens;
class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasFactory, Notifiable, HasRoles, HasApiTokens; 

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'profile_image_link',
        'referral_code',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }
    public function isAdmin(): bool
    {
        return $this->hasRole('super_admin'); // Assuming "admin" was a typo
    }

    public function userAreas()
    {
        return $this->hasMany(UserArea::class);
    }

    public function mapsOwned(): HasMany
{
    return $this->hasMany(UserMap::class, 'owner_id');
}

public function mapsSharedWithMe(): BelongsToMany
{
    return $this->belongsToMany(UserMap::class, 'user_map_access', 'user_id', 'user_map_id')
                ->withPivot('role')
                ->withTimestamps();
}

public function mapsAccessible()
{
    return UserMap::where(function ($query) {
        $query->where('owner_id', $this->id)
              ->orWhere(function ($q) {
                  $q->whereHas('viewers', fn ($q2) => $q2->where('user_id', $this->id));
              })
              ->orWhere('is_public', true);
    })->get();
}

public function shareMap(UserMap $map, string $role = 'viewer'): bool
{
    if ($map->owner_id === $this->id) {
        return false; // Can't share with self
    }

    $map->viewers()->syncWithoutDetaching([
        $this->id => ['role' => $role]
    ]);

    return true;
}
    
}
