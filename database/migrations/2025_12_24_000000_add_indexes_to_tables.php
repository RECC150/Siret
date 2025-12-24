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
        // Índices para entes (las otras tablas ya tienen índices en sus migraciones de creación)
        Schema::table('entes', function (Blueprint $table) {
            $table->index('classification_id');
            $table->index('title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('entes', function (Blueprint $table) {
            $table->dropIndex(['classification_id']);
            $table->dropIndex(['title']);
        });
    }
};
