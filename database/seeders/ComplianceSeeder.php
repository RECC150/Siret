<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class ComplianceSeeder extends Seeder
{
    public function run()
    {
        $entes = range (1, 75);
        $years = range(2000, 2235);
        $months = [
            'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
            'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
        ];
        $statuses = ['cumplio', 'parcial', 'no'];

        $batch = [];

        foreach ($entes as $ente_id) {
            foreach ($years as $year) {
                foreach ($months as $month) {
                    $batch[] = [
                        'ente_id' => $ente_id,
                        'year' => $year,
                        'month' => $month,
                        'status' => $statuses[array_rand($statuses)],
                        'created_at' => now(),
                    ];
                }
            }
        }

        // Inserción en lotes
        foreach (array_chunk($batch, 1000) as $chunk) {
            DB::table('compliances')->insert($chunk);
        }
    }
}
