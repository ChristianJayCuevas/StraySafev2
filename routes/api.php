<?php 

use App\Http\Controllers\Map\AnimalPinsController;

Route::middleware('auth')->group(function () {
    Route::get('/animal-pins', [AnimalPinsController::class, 'index']);
    Route::post('/animal-pins', [AnimalPinsController::class, 'store']);
    Route::delete('/animal-pins/{id}', [AnimalPinsController::class, 'destroy']);


    Route::middleware([ValidateStaticToken::class])->group(function () {
        Route::post('/user/image', [UserController::class, 'updateProfileImage']);
        Route::post('/user/signup', [UserController::class, 'register']);
        Route::post('/mobilelogin', [UserController::class, 'login']);
        Route::get('/mobileusers', [UserController::class, 'fetchUsers']);
        Route::get('mobileuser/me', [UserController::class, 'fetchLoggedInUser']);
        Route::get('/mobileregisteredanimals', [MobileRegisteredAnimalController::class, 'fetchRegisteredAnimals']);
        Route::post('/mobileregisteredanimals', [MobileRegisteredAnimalController::class, 'storeRegisteredAnimal']);
    });
});
