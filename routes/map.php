<?php
use App\Http\Controllers\Map\UserMapController;
use Illuminate\Support\Facades\Route;

Route::middleware('auth')->group(function () {
    Route::get('/user-maps', [UserMapController::class, 'index']);
    Route::post('/user-maps', [UserMapController::class, 'store']);
    Route::get('/user-maps/{id}', [UserMapController::class, 'show']);
    Route::post('/user-maps/access-code', [UserMapController::class, 'accessByCode']);
});