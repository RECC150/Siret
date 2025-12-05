<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up()
    {
        Schema::create('entes', function (Blueprint $table) {
            $table->id();
            $table->string('title', 250);
            $table->unsignedBigInteger('classification_id')->nullable();
            $table->string('img', 500)->nullable();
            $table->timestamps();

            $table->foreign('classification_id')
                ->references('id')
                ->on('classifications')
                ->onDelete('set null');
        });
    }


    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('entes');
    }
};
