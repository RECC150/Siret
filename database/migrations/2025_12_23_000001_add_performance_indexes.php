<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations - Agregar índices para mejorar rendimiento
     */
    public function up(): void
    {
        Schema::table('compliances', function (Blueprint $table) {
            // Índice compuesto para búsquedas por año
            $table->index('year', 'idx_compliances_year');

            // Índice compuesto para búsquedas por año y mes
            $table->index(['year', 'month'], 'idx_compliances_year_month');

            // Índice para búsquedas por ente_id y año
            $table->index(['ente_id', 'year'], 'idx_compliances_ente_year');

            // Índice para ordenamiento por fecha de creación
            $table->index('created_at', 'idx_compliances_created_at');
        });

        Schema::table('entes_activos', function (Blueprint $table) {
            // Índice compuesto para búsquedas por año
            $table->index('year', 'idx_entes_activos_year');

            // Índice compuesto único para evitar duplicados
            $table->index(['ente_id', 'year'], 'idx_entes_activos_ente_year');
        });

        Schema::table('entes', function (Blueprint $table) {
            // Índice para ordenamiento por título
            $table->index('title', 'idx_entes_title');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('compliances', function (Blueprint $table) {
            $table->dropIndex('idx_compliances_year');
            $table->dropIndex('idx_compliances_year_month');
            $table->dropIndex('idx_compliances_ente_year');
            $table->dropIndex('idx_compliances_created_at');
        });

        Schema::table('entes_activos', function (Blueprint $table) {
            $table->dropIndex('idx_entes_activos_year');
            $table->dropIndex('idx_entes_activos_ente_year');
        });

        Schema::table('entes', function (Blueprint $table) {
            $table->dropIndex('idx_entes_title');
        });
    }
};
