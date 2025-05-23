<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('animal_pins', function (Blueprint $table) {
            $table->id();
            $table->string('animal_type')->nullable();
            $table->string('stray_status')->nullable();
            $table->string('breed')->nullable();
            $table->string('collar')->nullable();
            $table->string('picture')->nullable();
            $table->text('camera')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('detection_id')->nullable()->unique();
            $table->foreignId('user_map_id')->nullable()->constrained('user_maps')->nullOnDelete();
            $table->foreignId('camera_pin_id')->nullable()->constrained('camera_pins')->nullOnDelete();
            $table->index('camera_pin_id');
            $table->index('user_map_id');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('animal_pins');
    }
};
