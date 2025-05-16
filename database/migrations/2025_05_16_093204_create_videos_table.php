<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('videos', function (Blueprint $table) {
            $table->id();
            $table->string('title');
            $table->string('description')->nullable();
            $table->string('filename');
            $table->string('path');
            $table->string('mime_type');
            $table->bigInteger('size');
            $table->string('thumbnail_path')->nullable();
            $table->integer('duration')->nullable();
            $table->string('status')->default('processing'); // processing, ready, failed
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('videos');
    }
};