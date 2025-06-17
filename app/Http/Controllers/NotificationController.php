<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Notifications\PushNotification;
use App\Models\PushNotificationHistory;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Intervention\Image\ImageManager;
use Intervention\Image\Drivers\Gd\Driver;

class NotificationController extends Controller
{
    public function sendNotification(Request $request)
    {
        $request->validate([
            'user_id' => 'required|exists:users,id',
            'title' => 'required|string|max:255',
            'body' => 'required|string',
            'action' => 'nullable|string',
        ]);
        $manager = new ImageManager(new Driver());

        // Extract base64 data and format
        $base64 = $request->image;

        // Match the mime type
        if (preg_match('#^data:image/(\w+);base64,#i', $base64, $matches)) {
            $format = strtolower($matches[1]); // e.g., "jpeg", "png"
        } else {
            return response()->json(['message' => 'Invalid base64 image format'], 400);
        }

        // Strip the base64 prefix and decode
        $rawImage = base64_decode(preg_replace('#^data:image/\w+;base64,#i', '', $base64));

        $image = $manager->read($rawImage);

        // Encode using correct format (e.g. 'jpeg', 'png') and quality
        $encoded = $image->encode($format, 50)->toString();

        // Return compressed base64
        $compressedBase64 = 'data:image/' . $format . ';base64,' . base64_encode($encoded);
        
        $user = User::find($request->user_id);
        $user->notify(new PushNotification(
            $request->title,
            $request->body,
            $request->action,
            $compressedBase64,
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