<?php
use App\Http\Controllers\Map\UserMapController;
use App\Http\Controllers\Map\UserAreaController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/user-maps', [UserMapController::class, 'index']);
    Route::post('/user-maps', [UserMapController::class, 'store']);
    Route::get('/user-maps/{id}', [UserMapController::class, 'show']);
    Route::post('/user-maps/access-code', [UserMapController::class, 'accessByCode']);

    Route::get('/user-areas', [UserAreaController::class, 'index']);
    Route::post('/user-areas', [UserAreaController::class, 'store']);
    Route::get('/user-areas/{id}', [UserAreaController::class, 'show']);
    Route::put('/user-areas/{id}', [UserAreaController::class, 'update']);
    Route::delete('/user-areas/{id}', [UserAreaController::class, 'destroy']);
});