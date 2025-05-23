<?php

// database/migrations/YYYY_MM_DD_HHMMSS_create_animal_detections_table.php

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
        Schema::create('animal_detections', function (Blueprint $table) {
            $table->id(); // Auto-incrementing primary key
            $table->string('breed')->nullable();
            $table->string('contact_number')->nullable();
            $table->longText('frame_base64')->nullable(); // For potentially long base64 strings
            $table->boolean('has_leash')->nullable();
            $table->boolean('is_registered')->nullable();
            $table->string('leash_color')->nullable();
            $table->string('pet_name')->nullable();
            $table->string('pet_type')->nullable();
            $table->longText('reg_base64')->nullable(); 
            $table->timestamp('detected_at')->nullable(); 
            $table->string('external_api_id')->nullable()->comment('ID from the external API');
            $table->string('external_api_type')->nullable()->comment('Type from the external API, e.g., dog, cat');
            $table->timestamp('external_data_updated_at')->nullable()->comment('Timestamp when this external record was last processed');
            $table->unique(['external_api_id', 'external_api_type'], 'animal_detections_external_unique');
            $table->string('rtsp_url')->nullable();
            $table->string('track_id')->nullable();
            $table->string('stable_class')->nullable();
            $table->timestamp('detection_timestamp')->nullable();
            $table->decimal('similarity_score', 5, 4)->nullable();
            $table->string('frame_path')->nullable();
            $table->string('reg_path')->nullable();
            $table->timestamps(); 
        });
           

    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('animal_detections');
    }
};