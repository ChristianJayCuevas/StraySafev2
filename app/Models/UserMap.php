<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class UserMap extends Model
{
    use HasFactory;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'owner_id',
        'name',
        'description',
        'access_code',
        'settings',
        'default_view',
        'is_public',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'settings' => 'array',
        'default_view' => 'array',
        'is_public' => 'boolean',
    ];

    /**
     * Generate a unique access code for the map
     * 
     * @return string
     */
    public static function generateAccessCode(): string
    {
        do {
            $code = strtoupper(Str::random(6));
        } while (self::where('access_code', $code)->exists());

        return $code;
    }

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function viewers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'user_map_access')
                    ->withPivot('role')
                    ->withTimestamps();
    }

    public function canBeAccessedBy(User $user): bool
    {
        return $user->id === $this->owner_id
            || $this->is_public
            || $this->viewers()->where('users.id', $user->id)->exists();
    }

    public function assignUser(User $user, string $role = 'viewer'): void
    {
        $this->viewers()->syncWithoutDetaching([
            $user->id => ['role' => $role]
        ]);
    }

    public function getUserRole(User $user): ?string
    {
        if ($user->id === $this->owner_id) {
            return 'owner';
        }

        $access = $this->viewers()->where('users.id', $user->id)->first();
        return $access?->pivot->role;
    }
}
