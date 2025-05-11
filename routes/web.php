<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Map\AnimalPinsController;
Route::get('/', function () {
    return Inertia::render('Welcome');
})->name('home');

Route::get('dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::get('straymap', function () {
    return Inertia::render('management/StrayMap');
})->middleware(['auth', 'verified'])->name('straymap');

Route::get('detections', function(){
    return Inertia::render('Detections');
})->middleware(['auth', 'verified'])->name('detections');

Route::get('cctv', function(){
    return Inertia::render('management/CCTVManagement');
})->middleware(['auth', 'verified'])->name('cctv');

Route::get('cctvmonitor', function(){
    return Inertia::render('management/CCTVMonitoring');
})->middleware(['auth', 'verified'])->name('cctvmonitor');

Route::get('registered-pets', function(){
    return Inertia::render('RegisteredPets');
})->middleware(['auth', 'verified'])->name('registeredpets');

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/map.php';
