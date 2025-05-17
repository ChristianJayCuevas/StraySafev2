<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Would you like the install button to appear on all pages?
      Set true/false
    |--------------------------------------------------------------------------
    */

    'install-button' => true,

    /*
    |--------------------------------------------------------------------------
    | PWA Manifest Configuration
    |--------------------------------------------------------------------------
    |  php artisan erag:pwa-update-manifest
    */
    'install-button' => true,
    'manifest' => [
        
        'name' => 'StraySafe',
        'short_name' => 'StraySafe',
        'background_color' => '#6777ef',
        'display' => 'fullscreen',
        'description' => 'Stray Safe Application.',
        'theme_color' => '#6777ef',
        'icons' => [
            [
                'src' => '/storage/images/newlogo1.png',
                'sizes' => '512x512',
                'type' => 'image/png',
            ],
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Debug Configuration
    |--------------------------------------------------------------------------
    | Toggles the application's debug mode based on the environment variable
    */

    'debug' => env('APP_DEBUG', false),

];
