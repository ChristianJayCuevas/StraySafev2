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
            $table->longText('reg_base64')->nullable(); // For potentially long base64 strings
            $table->timestamp('detected_at')->nullable(); // For storing a proper DB timestamp if possible
            $table->string('external_api_id')->nullable()->after('id')->comment('ID from the external API');
            $table->string('external_api_type')->nullable()->after('external_api_id')->comment('Type from the external API, e.g., dog, cat');
            $table->timestamp('external_data_updated_at')->nullable()->after('detected_at')->comment('Timestamp when this external record was last processed');

            // Add a unique constraint
            $table->unique(['external_api_id', 'external_api_type'], 'animal_detections_external_unique');
            $table->timestamps(); // created_at and updated_at
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