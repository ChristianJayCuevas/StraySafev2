<?php 

use App\Http\Controllers\Map\AnimalPinsController;

Route::middleware('auth')->group(function () {
    Route::get('/animal-pins', [AnimalPinsController::class, 'index']);
    Route::post('/animal-pins', [AnimalPinsController::class, 'store']);
    Route::delete('/animal-pins/{id}', [AnimalPinsController::class, 'destroy']);
});
