<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EnteActivo;
use Illuminate\Http\Request;

class EnteActivoController extends Controller
{
    public function index(Request $request)
    {
        try {
            $year = $request->input('year');

            if ($year) {
                $rows = EnteActivo::select('id', 'ente_id', 'year')
                    ->where('year', (int)$year)
                    ->orderBy('ente_id', 'ASC')
                    ->get();
            } else {
                $rows = EnteActivo::select('id', 'ente_id', 'year')
                    ->orderBy('year', 'DESC')
                    ->orderBy('ente_id', 'ASC')
                    ->limit(1000)
                    ->get();
            }

            return response()->json($rows);
        } catch (\Exception $e) {
            return response()->json(['error' => 'query_failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $year = (int)$request->input('year');
            $ente_id = (int)$request->input('ente_id');

            if (!$year || !$ente_id) {
                return response()->json(['success' => false, 'message' => 'Faltan parámetros year o ente_id'], 400);
            }

            EnteActivo::firstOrCreate(
                ['ente_id' => $ente_id, 'year' => $year]
            );

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request)
    {
        try {
            $year = (int)$request->input('year');
            $ente_id = (int)$request->input('ente_id');

            if (!$year || !$ente_id) {
                return response()->json(['success' => false, 'message' => 'Faltan parámetros year o ente_id'], 400);
            }

            EnteActivo::where('year', $year)
                ->where('ente_id', $ente_id)
                ->delete();

            return response()->json(['success' => true]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }
}
