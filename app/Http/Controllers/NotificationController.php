<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\PushNotification;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function sendNotification(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'action' => 'nullable|string'
        ]);
        
        $user = User::find($request->user_id);
        $user->notify(new PushNotification(
            $request->title,
            $request->body,
            $request->action
        ));
        
        return response()->json(['message' => 'Notification sent successfully']);
    }
    
    public function sendBroadcast(Request $request)
    {
        $request->validate([
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'action' => 'nullable|string'
        ]);
        
        $users = User::whereNotNull('id')->get();
        \Illuminate\Support\Facades\Notification::send(
            $users,
            new PushNotification(
                $request->title,
                $request->body,
                $request->action
            )
        );
        
        return response()->json(['message' => 'Broadcast notification sent successfully']);
    }
}