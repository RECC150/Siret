<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\EnteController;
use App\Http\Controllers\Api\ClasificacionController;
use App\Http\Controllers\Api\ComplianceController;
use App\Http\Controllers\Api\EnteActivoController;

Route::post('/login', [AuthController::class, 'login']);

// Rutas públicas: listado de entes, cumplimientos y entes activos (solo lectura)
Route::get('/entes', [EnteController::class, 'index']);
Route::get('/clasificaciones', [ClasificacionController::class, 'index']);
Route::get('/compliances', [ComplianceController::class, 'index']);
Route::get('/entes-activos', [EnteActivoController::class, 'index']);

//Los usuarios que tienen un token válido pueden acceder a estas rutas
Route::middleware('auth:sanctum')->group(function(){
    Route::get('/user', function (Request $request){
        return $request->user();
    });
    Route::post('/logout', [AuthController::class, 'logout']);

    // Entes - operaciones protegidas
    Route::post('/entes', [EnteController::class, 'store']);
    Route::put('/entes/{id}', [EnteController::class, 'update']);
    Route::delete('/entes/{id}', [EnteController::class, 'destroy']);

    // Clasificaciones
    Route::post('/clasificaciones', [ClasificacionController::class, 'store']);
    Route::put('/clasificaciones/{id}', [ClasificacionController::class, 'update']);
    Route::delete('/clasificaciones/{id}', [ClasificacionController::class, 'destroy']);

    // Cumplimientos
    Route::delete('/compliances', [ComplianceController::class, 'destroy']);
    Route::post('/compliances/update', [ComplianceController::class, 'update']);

    // Entes activos
    Route::post('/entes-activos', [EnteActivoController::class, 'store']);
    Route::delete('/entes-activos', [EnteActivoController::class, 'destroy']);
});
