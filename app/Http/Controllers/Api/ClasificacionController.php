<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Classification;
use Illuminate\Http\Request;

class ClasificacionController extends Controller
{
    public function index()
    {
        try {
            $rows = Classification::select('id', 'name')
                ->orderBy('name', 'ASC')
                ->get();
            return response()->json($rows);
        } catch (\Exception $e) {
            return response()->json(['error' => 'query_failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $title = trim($request->input('title', ''));

            if ($title === '') {
                return response()->json(['error' => 'missing_title'], 400);
            }

            $classification = Classification::create(['name' => $title]);

            return response()->json([
                'success' => true,
                'id' => $classification->id,
                'title' => $title,
                'name' => $title,
                'message' => 'Clasificación creada exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'insert_failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $id = (int)$id;
            $title = trim($request->input('title', ''));

            if ($id <= 0 || $title === '') {
                return response()->json(['error' => 'invalid_input'], 400);
            }

            $classification = Classification::find($id);
            if (!$classification) {
                return response()->json(['error' => 'not_found'], 404);
            }

            $classification->name = $title;
            $classification->save();

            return response()->json([
                'success' => true,
                'id' => $id,
                'title' => $title,
                'name' => $title,
                'message' => 'Clasificación actualizada exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'update_failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function destroy(Request $request, $id)
    {
        try {
            $id = (int)$id;

            if ($id <= 0) {
                return response()->json(['error' => 'invalid_id'], 400);
            }

            $classification = Classification::find($id);
            if (!$classification) {
                return response()->json(['success' => false, 'error' => 'not_found', 'message' => 'Clasificación no encontrada'], 404);
            }

            // Actualizar entes relacionados
            $classification->entes()->update(['classification_id' => null]);
            $classification->delete();

            return response()->json([
                'success' => true,
                'id' => $id,
                'deleted' => true,
                'message' => 'Clasificación eliminada exitosamente'
            ]);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'delete_failed', 'message' => $e->getMessage()], 500);
        }
    }
}
