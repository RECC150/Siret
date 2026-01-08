<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Ente;
use App\Models\Classification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class EnteController extends Controller
{
    public function index()
    {
        try {

            $withCompliances = request('with_compliances', false);

            if ($withCompliances) {

                $entes = Ente::with(['classification', 'compliances'])
                    ->select('id', 'title', 'img', 'classification_id', 'link')
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
                        })->toArray(),
                        'link' => $e->link
                    ];
                }
            } else {

                $entes = Ente::with('classification')
                    ->select('id', 'title', 'img', 'classification_id', 'link')
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
                        'link' => $e->link
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
                // store in public disk (storage/app/public/entes)
                $path = $file->storeAs('entes', $filename, 'public');

                // Also copy the stored file into public/storage so hosts without storage:link can serve it
                $storedFullPath = storage_path('app/public/' . $path);
                $publicPath = public_path('storage/' . $path);
                $publicDir = dirname($publicPath);
                if (!file_exists($publicDir)) {
                    @mkdir($publicDir, 0755, true);
                }
                try {
                    @copy($storedFullPath, $publicPath);
                } catch (\Exception $e) {
                    // non-fatal: file might be unreadable or copy may fail on some systems
                }

                // Build API host URLs as requested by deployment (primary + fallback)
                $apiHost = 'https://api.siret-graficas-interactivas.sifbcs.online';
                // Primary: https://api.../storage/<filename>
                $imgPath = $apiHost . '/storage/' . $filename;
                // Also store a fallback path in case needed by the frontend logic (not saved to DB)
                $fallbackStoragePath = $apiHost . '/storage/app/public/' . $filename;
                // Note: we save $imgPath in DB so frontend gets the api host URL without /entes/
            }

            $link = trim($request->input('link', '')) ?: null;

            $ente = Ente::create([
                'title' => $title,
                'img' => $imgPath,
                'classification_id' => $classification_id,
                'link' => $link
            ]);

            return response()->json([
                'success' => true,
                'id' => $ente->id,
                'title' => $title,
                'img' => $imgPath,
                'link' => $link,
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

            $classification_id = $ente->classification_id; // Preserve existing classification
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
                // store in public disk (storage/app/public/entes)
                $path = $file->storeAs('entes', $filename, 'public');

                // Also copy the stored file into public/storage so hosts without storage:link can serve it
                $storedFullPath = storage_path('app/public/' . $path);
                $publicPath = public_path('storage/' . $path);
                $publicDir = dirname($publicPath);
                if (!file_exists($publicDir)) {
                    @mkdir($publicDir, 0755, true);
                }
                try {
                    @copy($storedFullPath, $publicPath);
                } catch (\Exception $e) {
                    // ignore copy errors
                }

                // Build API host URLs as requested by deployment
                $apiHost = 'https://api.siret-graficas-interactivas.sifbcs.online';
                $imgPath = $apiHost . '/storage/' . $filename;
                $fallbackStoragePath = $apiHost . '/storage/app/public/' . $filename;
            }

            $link = trim($request->input('link', '')) ?: null;

            $ente->title = $title;
            $ente->classification_id = $classification_id;
            $ente->link = $link;
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
                'link' => $link,
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


            $ente->entesActivos()->delete();
            $ente->compliances()->delete();
            $ente->delete();

            return response()->json(['success' => true, 'message' => 'Ente eliminado exitosamente']);
        } catch (\Exception $e) {
            return response()->json(['success' => false, 'error' => 'delete_failed', 'message' => $e->getMessage()], 500);
        }
    }
}
