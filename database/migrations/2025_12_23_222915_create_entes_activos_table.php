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
        Schema::create('entes_activos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ente_id')->constrained('entes')->onDelete('cascade');
            $table->smallInteger('year');
            $table->timestamps();

            // Constraint único y índices
            $table->unique(['ente_id', 'year']);
            $table->index('ente_id');
            $table->index('year');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entes_activos');
    }
};
