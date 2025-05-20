<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\PushNotification;
use App\Models\PushNotificationHistory;
use Illuminate\Http\Request;
use Inertia\Inertia;

class NotificationController extends Controller
{
    public function sendNotification(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'action' => 'nullable|string',
            'image' => 'nullable|url', 
        ]);
        
        $user = User::find($request->user_id);
        $user->notify(new PushNotification(
            $request->title,
            $request->body,
            $request->action,
            $request->image,
            false

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
                $request->action,
                $request->image,
                true
            )
        );
        
        return response()->json(['message' => 'Broadcast notification sent successfully']);
    }

    public function index()
{
    $user = auth()->user();
    $notifications = PushNotificationHistory::where('user_id', $user->id)
        ->orderBy('created_at', 'desc')
        ->paginate(10);
    
    return Inertia::render('mobile/NotificationPage', [
        'notifications' => $notifications
    ]);
}
    
public function markAsRead($id)
{
    $notification = PushNotificationHistory::findOrFail($id);
    
    // Check if notification belongs to the authenticated user
    if ($notification->user_id !== auth()->id()) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }
    
    $notification->update([
        'is_read' => true,
        'read_at' => now(),
    ]);
    
    return response()->json(['message' => 'Notification marked as read']);
}

public function markAllAsRead()
{
    $user = auth()->user();
    
    PushNotificationHistory::where('user_id', $user->id)
        ->where('is_read', false)
        ->update([
            'is_read' => true,
            'read_at' => now(),
        ]);
    
    return response()->json(['message' => 'All notifications marked as read']);
}
public function delete($id)
{
    $notification = PushNotificationHistory::findOrFail($id);
    
    // Check if notification belongs to the authenticated user
    if ($notification->user_id !== auth()->id()) {
        return response()->json(['message' => 'Unauthorized'], 403);
    }
    
    $notification->delete();
    
    return response()->json(['message' => 'Notification deleted successfully']);
}

}