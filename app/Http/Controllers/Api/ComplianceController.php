<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Compliance;
use App\Models\EnteActivo;
use Illuminate\Http\Request;

class ComplianceController extends Controller
{
    public function index()
    {
        try {
            $limit = request('limit', null); // Si no se pasa limit, cargar todos

            $query = Compliance::with('ente.classification')
                ->select('id', 'ente_id', 'year', 'month', 'status', 'note', 'created_at')
                ->orderBy('created_at', 'DESC');

            // Aplicar limit solo si se especifica
            if ($limit !== null && $limit > 0) {
                $query->limit($limit);
            }

            $compliances = $query->get()
                ->map(function ($c) {
                    return [
                        'id' => $c->id,
                        'ente_id' => $c->ente_id,
                        'year' => $c->year,
                        'month' => $c->month,
                        'status' => $c->status,
                        'note' => $c->note,
                        'created_at' => $c->created_at,
                        'ente_title' => $c->ente->title ?? null,
                        'ente_img' => $c->ente->img ?? null,
                        'classification' => $c->ente->classification->name ?? null
                    ];
                });

            return response()->json($compliances);
        } catch (\Exception $e) {
            return response()->json(['error' => 'query_failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request)
    {
        try {
            $year = $request->input('year');
            $month = $request->input('month');

            if (!$year) {
                return response()->json(['success' => false, 'message' => 'year es requerido'], 400);
            }

            if ($month) {
                $deleted = Compliance::where('year', $year)
                    ->where('month', $month)
                    ->delete();

                return response()->json([
                    'success' => true,
                    'message' => 'Mes eliminado correctamente',
                    'deleted' => $deleted
                ]);
            } else {
                $deletedCompliances = Compliance::where('year', $year)->delete();
                $deletedEntes = EnteActivo::where('year', $year)->delete();

                return response()->json([
                    'success' => true,
                    'message' => 'Año eliminado correctamente',
                    'deleted_compliances' => $deletedCompliances,
                    'deleted_entes_activos' => $deletedEntes
                ]);
            }
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request)
    {
        try {
            $updates = $request->input('updates', []);

            if (!is_array($updates)) {
                return response()->json(['success' => false, 'message' => 'Datos inválidos'], 400);
            }

            foreach ($updates as $update) {
                if (!isset($update['ente_id'], $update['year'], $update['month'], $update['status'])) {
                    continue;
                }

                $compliance = Compliance::where('ente_id', $update['ente_id'])
                    ->where('year', $update['year'])
                    ->where('month', $update['month'])
                    ->first();

                if ($compliance) {
                    $compliance->status = $update['status'];
                    $compliance->save();
                } else {
                    Compliance::create([
                        'ente_id' => $update['ente_id'],
                        'year' => $update['year'],
                        'month' => $update['month'],
                        'status' => $update['status']
                    ]);
                }
            }

            return response()->json([
                'success' => true,
                'message' => 'Cumplimientos actualizados correctamente'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Error de base de datos: ' . $e->getMessage()
            ], 500);
        }
    }
}
