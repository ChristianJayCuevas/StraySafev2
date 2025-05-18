<?php

use Illuminate\Support\Facades\Route;
use Inertia\Inertia;
use App\Http\Controllers\Map\AnimalPinsController;
use App\Http\Controllers\CameraController;
use App\Http\Controllers\API\UserController;
use App\Http\Controllers\API\MobileRegisteredAnimalController;
use App\Http\Middleware\ValidateStaticToken;
use App\Http\Controllers\RegisteredAnimalController;
use App\Http\Controllers\DashboardController;

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

Route::get('/cameras', [CameraController::class, 'getCameras']);
Route::post('/cameras', [CameraController::class, 'store']);
Route::put('/cameras/{id}', [CameraController::class, 'update']);
Route::patch('/cameras/{id}/status', [CameraController::class, 'updateStatus']);
Route::patch('/cameras/{id}/mode', [CameraController::class, 'updateMode']);
Route::delete('/cameras/{id}', [CameraController::class, 'destroy']);

Route::middleware([ValidateStaticToken::class])->group(function () {
    Route::post('/api/user/image', [UserController::class, 'updateProfileImage']);
    Route::post('/api/user/signup', [UserController::class, 'register']);
    Route::post('/api/mobilelogin', [UserController::class, 'login']);
    Route::get('/api/mobileusers', [UserController::class, 'fetchUsers']);
    Route::get('api/mobileuser/me', [UserController::class, 'fetchLoggedInUser']);
    Route::get('/api/mobileregisteredanimals', [MobileRegisteredAnimalController::class, 'fetchRegisteredAnimals']);
    Route::post('/api/mobileregisteredanimals', [MobileRegisteredAnimalController::class, 'storeRegisteredAnimal']);
});
Route::get('/registered-animals', [RegisteredAnimalController::class, 'index']);
Route::post('/registered-animals', [RegisteredAnimalController::class, 'store']);
Route::put('/registered-animals/{id}', [RegisteredAnimalController::class, 'update']);
Route::delete('/registered-animals/{id}', [RegisteredAnimalController::class, 'destroy']);

Route::middleware('auth')->group(function () {
    Route::get('/api/animal-pins', [AnimalPinsController::class, 'index']);
    Route::post('/api/animal-pins', [AnimalPinsController::class, 'store']);
    Route::delete('/api/animal-pins/{id}', [AnimalPinsController::class, 'destroy']);
});

Route::get('/stats/summary', [DashboardController::class, 'summary']);
Route::get('/stats/summary2', [DashboardController::class, 'summary2']);

Route::apiResource('videos', VideoController::class);
Route::post('videos/upload-chunk', [VideoController::class, 'uploadChunk']);
Route::post('videos/complete-chunked-upload', [VideoController::class, 'completeChunkedUpload']);

Route::middleware('auth:sanctum')->group(function () {
    // Store push subscription
    Route::post('/push-subscriptions', function (Request $request) {
        $request->user()->updatePushSubscription(
            $request->input('endpoint'),
            $request->input('keys.p256dh'),
            $request->input('keys.auth')
        );
        
        return response()->json(['success' => true]);
    });
    
    // Delete push subscription
    Route::delete('/push-subscriptions', function (Request $request) {
        $request->user()->deletePushSubscription($request->input('endpoint'));
        
        return response()->json(['success' => true]);
    });
});
Route::middleware('auth:sanctum')->group(function () {
    Route::post('/send-notification', [NotificationController::class, 'sendNotification']);
    Route::post('/send-broadcast', [NotificationController::class, 'sendBroadcast']);
});
Route::get('/test-notification', function () {
    $user = auth()->user();
    if ($user) {
        $user->notify(new \App\Notifications\PushNotification(
            'Test Notification',
            'This is a test push notification',
            '/dashboard'
        ));
        return 'Notification sent!';
    }
    return 'User not logged in!';
});

require __DIR__.'/settings.php';
require __DIR__.'/auth.php';
require __DIR__.'/map.php';
require __DIR__.'/api.php';
