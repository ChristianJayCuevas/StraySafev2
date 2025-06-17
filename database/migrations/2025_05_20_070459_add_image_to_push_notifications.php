<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('push_notification_histories', function (Blueprint $table) {
            $table->longText('image')->nullable()->after('action');
        });
    }

    public function down(): void
    {
        Schema::table('push_notification_histories', function (Blueprint $table) {
            $table->dropColumn('image');
        });
    }
};