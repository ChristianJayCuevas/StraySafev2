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
        Schema::create('camera_pins', function (Blueprint $table) {
            $table->id();
            $table->string('camera_name')->nullable();
            $table->string('hls_url')->nullable();
            $table->text('camera_description')->nullable();
            $table->decimal('latitude', 10, 7);
            $table->decimal('longitude', 10, 7);
            $table->integer('direction');
            $table->foreignId('user_map_id')->nullable()->constrained('user_maps')->nullOnDelete();
            $table->string('image_link')->nullable();
            $table->index('user_map_id');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('camera_pins');
    }
};
