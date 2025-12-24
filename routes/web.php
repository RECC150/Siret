<?php
// filepath: c:\laragon\www\siret\routes\web.php

use Illuminate\Support\Facades\Route;

// ...existing code...

// Servir React app compilada (debe estar al FINAL)
// Excluye rutas que empiezan con 'api'
Route::get('/{any}', function () {
    return file_get_contents(public_path('react-dist/index.html'));
})->where('any', '(?!api).*');
