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
Route::get('/animalpins', [AnimalPinsController::class, 'index'])->name('animal-pins.index');
Route::middleware(['auth', 'verified'])->group(function () {
    Route::post('/animalpins', [AnimalPinsController::class, 'store'])->name('animal-pins.store');
});
Route::delete('/animalpins/{id}', [AnimalPinsController::class, 'destroy']);
require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/map.php';
