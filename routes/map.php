<?php
use App\Http\Controllers\Map\UserMapController;
use App\Http\Controllers\Map\UserAreaController;
use App\Http\Controllers\Map\CameraPinsController;
use App\Http\Controllers\Map\AnimalPinsController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/user-maps', [UserMapController::class, 'index']);
    Route::post('/user-maps', [UserMapController::class, 'store']);
    Route::get('/user-maps/{id}', [UserMapController::class, 'show']);
    Route::post('/user-maps/access-code', [UserMapController::class, 'accessByCode']);
    Route::delete('/user-maps/{id}',[UserMapController::class, 'destroy']);

    Route::get('/user-areas', [UserAreaController::class, 'index']);
    Route::post('/user-areas', [UserAreaController::class, 'store']);
    Route::get('/user-areas/{id}', [UserAreaController::class, 'show']);
    Route::put('/user-areas/{id}', [UserAreaController::class, 'update']);
    Route::delete('/user-areas/{id}', [UserAreaController::class, 'destroy']);

    Route::get('/camera-pins', [CameraPinsController::class, 'index']);
    Route::post('/camera-pins', [CameraPinsController::class, 'store']);
    Route::delete('/camera-pins/{id}', [CameraPinsController::class, 'destroy']);


});