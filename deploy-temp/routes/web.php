<?php
// filepath: c:\laragon\www\siret\routes\web.php

use Illuminate\Support\Facades\Route;

// ...existing code...

// Servir React app compilada (debe estar al FINAL)
Route::get('/{any}', function () {
    return view('app'); // o file_get_contents(public_path('index.html'))
})->where('any', '.*');
