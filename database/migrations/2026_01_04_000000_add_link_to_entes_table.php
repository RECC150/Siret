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
        Schema::table('entes', function (Blueprint $table) {
            $table->string('link', 500)->nullable()->after('img')->index();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('entes', function (Blueprint $table) {
            // Drop index first then column
            $table->dropIndex(['link']);
            $table->dropColumn('link');
        });
    }
};
