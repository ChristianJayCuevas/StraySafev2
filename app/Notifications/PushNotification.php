<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;
use App\Models\PushNotificationHistory as PushNotificationModel;

class PushNotification extends Notification
{
    private $title;
    private $body;
    private $action;
    private $image;
    private $isBroadcast;
    
    public function __construct($title, $body, $action = null, $image = null, $isBroadcast = false)
    {
        $this->title = $title;
        $this->body = $body;
        $this->action = $action;
        $this->image = $image;
        $this->isBroadcast = $isBroadcast;
    }
    
    public function via($notifiable)
    {
        return [WebPushChannel::class];
    }
    
    public function toWebPush($notifiable, $notification)
    {
        // Save notification to database
        PushNotificationModel::create([
            'user_id' => $notifiable->id,
            'title' => $this->title,
            'body' => $this->body,
            'action' => $this->action,
            'image' => $this->image,
            'is_broadcast' => $this->isBroadcast,
        ]);
        
        $message = (new WebPushMessage)
            ->title($this->title)
            ->body($this->body)
            ->data([
                'action' => $this->action,
                'image' => $this->image,
            ]);
            
        if ($this->action) {
            $message->action('View', $this->action);
        }
        
        // Add image if provided
        if ($this->image) {
            $message->image($this->image);
        }
        
        return $message;
    }
}