<template>
    <div>
      <Button variant="ghost" size="icon" @click="togglePush">
        <component
          :is="isPushEnabled ? BellRing : Bell"
          class="w-5 h-5"
        />
      </Button>
    </div>
  </template>
  
  <script setup>
  import { ref, onMounted } from 'vue'
  import { Button } from '@/components/ui/button'
  import { Bell, BellRing } from 'lucide-vue-next' // outline & filled-like icon
  
  const isPushEnabled = ref(false)
  const registration = ref(null)
  
  onMounted(async () => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      try {
        registration.value = await navigator.serviceWorker.getRegistration()
        if (registration.value) {
          const subscription = await registration.value.pushManager.getSubscription()
          isPushEnabled.value = subscription !== null
        }
      } catch (e) {
        console.error('Error checking push status', e)
      }
    }
  })
  
  async function togglePush() {
    isPushEnabled.value ? await unsubscribe() : await subscribe()
  }
  
  async function subscribe() {
    try {
      const sub = await registration.value.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array('{{ env("VAPID_PUBLIC_KEY") }}')
      })
  
      await fetch('/push-subscriptions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify(sub)
      })
  
      isPushEnabled.value = true
    } catch (e) {
      console.error('Error subscribing to push', e)
    }
  }
  
  async function unsubscribe() {
    try {
      const sub = await registration.value.pushManager.getSubscription()
      if (sub) {
        await sub.unsubscribe()
        await fetch('/push-subscriptions', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
          },
          body: JSON.stringify(sub)
        })
      }
  
      isPushEnabled.value = false
    } catch (e) {
      console.error('Error unsubscribing from push', e)
    }
  }
  
  function urlBase64ToUint8Array(base64String) {
    // Ensure the base64String is not undefined or null
    if (!base64String) {
        console.error('VAPID public key is missing');
        return new Uint8Array();
    }
    
    // Replace any URL-unsafe characters
    const base64 = base64String.replace(/[^A-Za-z0-9\-_]/g, '')
        .replace(/-/g, '+')
        .replace(/_/g, '/');
    
    // Add padding if needed
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const paddedBase64 = base64 + padding;
    
    try {
        // Convert base64 to raw binary data
        const rawData = window.atob(paddedBase64);
        
        // Convert raw binary to Uint8Array
        const outputArray = new Uint8Array(rawData.length);
        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    } catch (e) {
        console.error('Error decoding base64 string:', e);
        console.error('Original base64 string:', base64String);
        console.error('Processed base64 string:', paddedBase64);
        throw e;
    }
}
  </script>
  