<?php

namespace App\Notifications;

use Illuminate\Notifications\Notification;
use NotificationChannels\WebPush\WebPushMessage;
use NotificationChannels\WebPush\WebPushChannel;

class PushNotification extends Notification
{
    private $title;
    private $body;
    private $action;
    
    public function __construct($title, $body, $action = null)
    {
        $this->title = $title;
        $this->body = $body;
        $this->action = $action;
    }
    
    public function via($notifiable)
    {
        return [WebPushChannel::class];
    }
    
    public function toWebPush($notifiable, $notification)
    {
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