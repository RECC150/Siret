<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ente;
use App\Models\Classification;
use Illuminate\Http\Request;

class EnteController extends Controller
{
    public function index()
    {
        try {
            // Verificar si se pide incluir compliances (para vistas como CumplimientosMesAnio)
            $withCompliances = request('with_compliances', false);

            if ($withCompliances) {
                // Cargar entes con sus compliances
                $entes = Ente::with(['classification', 'compliances'])
                    ->select('id', 'title', 'img', 'classification_id')
                    ->orderBy('title', 'ASC')
                    ->get();

                $out = [];
                foreach ($entes as $e) {
                    $out[] = [
                        'id' => $e->id,
                        'title' => $e->title,
                        'img' => $e->img,
                        'classification_id' => $e->classification_id,
                        'classification' => $e->classification ? $e->classification->name : null,
                        'compliances' => $e->compliances->map(function($c) {
                            return [
                                'year' => $c->year,
                                'month' => $c->month,
                                'status' => $c->status,
                                'note' => $c->note
                            ];
                        })->toArray()
                    ];
                }
            } else {
                // Comportamiento original (sin compliances para mejor performance)
                $entes = Ente::with('classification')
                    ->select('id', 'title', 'img', 'classification_id')
                    ->orderBy('title', 'ASC')
                    ->get();

                $out = [];
                foreach ($entes as $e) {
                    $out[] = [
                        'id' => $e->id,
                        'title' => $e->title,
                        'img' => $e->img,
                        'classification_id' => $e->classification_id,
                        'classification' => $e->classification ? $e->classification->name : null
                    ];
                }
            }

            return response()->json($out);
        } catch (\Exception $e) {
            return response()->json(['error' => 'query_failed', 'message' => $e->getMessage()], 500);
        }
    }

    public function store(Request $request)
    {
        try {
            $title = trim($request->input('title', ''));
            $classificationName = trim($request->input('classification', ''));

            if ($title === '') {
                return response()->json(['error' => 'missing_title'], 400);
            }

            $classification_id = null;
            if ($classificationName !== '') {
                $classification = Classification::where('name', $classificationName)->first();
                if ($classification) {
                    $classification_id = $classification->id;
                } else {
                    $classification = Classification::create(['name' => $classificationName]);
                    $classification_id = $classification->id;
                }
            }

            $imgPath = null;
            if ($request->hasFile('icon') && $request->file('icon')->isValid()) {
                $file = $request->file('icon');
                $extension = $file->getClientOriginalExtension();
                $filename = bin2hex(random_bytes(8)) . '.' . $extension;
                $file->move(public_path('uploads/entes'), $filename);
                $imgPath = '/uploads/entes/' . $filename;
            }

            $ente = Ente::create([
                'title' => $title,
                'img' => $imgPath,
                'classification_id' => $classification_id
            ]);

            return response()->json([
                'success' => true,
                'id' => $ente->id,
                'title' => $title,
                'img' => $imgPath,
                'classification' => $ente->classification->name ?? '',
                'message' => 'Ente creado exitosamente'
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
            $classificationName = trim($request->input('classification', ''));

            if ($id <= 0 || $title === '') {
                return response()->json(['success' => false, 'error' => 'invalid_input', 'message' => 'ID y nombre son requeridos'], 400);
            }

            $ente = Ente::find($id);
            if (!$ente) {
                return response()->json(['success' => false, 'error' => 'not_found', 'message' => 'Ente no encontrado'], 404);
            }

            $classification_id = null;
            if ($classificationName !== '') {
                $classification = Classification::where('name', $classificationName)->first();
                if ($classification) {
                    $classification_id = $classification->id;
                } else {
                    $classification = Classification::create(['name' => $classificationName]);
                    $classification_id = $classification->id;
                }
            }

            $imgPath = null;
            if ($request->hasFile('icon') && $request->file('icon')->isValid()) {
                $file = $request->file('icon');
                $extension = $file->getClientOriginalExtension();
                $filename = bin2hex(random_bytes(8)) . '.' . $extension;
                $file->move(public_path('uploads/entes'), $filename);
                $imgPath = '/uploads/entes/' . $filename;
            }

            $ente->title = $title;
            $ente->classification_id = $classification_id;
            if ($imgPath) {
                $ente->img = $imgPath;
            }
            $ente->save();

            return response()->json([
                'success' => true,
                'id' => $id,
                'title' => $title,
                'classification' => $ente->classification->name ?? '',
                'img' => $imgPath,
                'message' => 'Ente actualizado exitosamente'
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
                return response()->json(['success' => false, 'error' => 'invalid_id', 'message' => 'ID inválido'], 400);
            }

            $ente = Ente::find($id);
            if (!$ente) {
                return response()->json(['success' => false, 'error' => 'not_found', 'message' => 'Ente no encontrado'], 404);
            }

            // Eliminar dependencias usando relaciones Eloquent
            $ente->entesActivos()->delete();
            $ente->compliances()->delete();
            $ente->delete();

            return response()->json(['success' => true, 'message' => 'Ente eliminado exitosamente']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'delete_failed', 'message' => $e->getMessage()], 500);
        }
    }
}
