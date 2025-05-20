<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;
use App\Models\PushNotificationHistory;
class PushNotification extends Notification
{
    private $title;
    private $body;
    private $action;
    
    public function __construct($title, $body, $action = null, $isBroadcast = false)
    {
        $this->title = $title;
        $this->body = $body;
        $this->action = $action;
        $this->isBroadcast = $isBroadcast;
    }
    
    public function via($notifiable)
    {
        return [WebPushChannel::class];
    }
    
    public function toWebPush($notifiable, $notification)
    {   
        PushNotificationHistory::create([
        'user_id' => $notifiable->id,
        'title' => $this->title,
        'body' => $this->body,
        'action' => $this->action,
        'is_broadcast' => $this->isBroadcast,
    ]);
        $message = (new WebPushMessage)
            ->title($this->title)
            ->body($this->body)
            ->data(['action' => $this->action]);
            
        if ($this->action) {
            $message->action('View', $this->action);
        }
        
        return $message;
    }
}