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
import { Bell, BellRing } from 'lucide-vue-next'

const vapidPublicKey = window.vapidPublicKey || ''
const isPushEnabled = ref(false)
const registration = ref(null)
const shouldResubscribe = ref(false)

onMounted(async () => {
  // Check if we're coming back after a page reload for subscription
  shouldResubscribe.value = localStorage.getItem('shouldResubscribe') === 'true'
  
  if (shouldResubscribe.value) {
    // Clear the flag
    localStorage.removeItem('shouldResubscribe')
  }
  
  if ('serviceWorker' in navigator && 'PushManager' in window) {
    try {
      // Wait for service worker to be ready
      if (navigator.serviceWorker.controller === null) {
        // Service worker not controlling the page yet
        await new Promise(resolve => {
          navigator.serviceWorker.addEventListener('controllerchange', () => {
            resolve();
          });
          
          // Add a timeout in case the controllerchange doesn't fire
          setTimeout(resolve, 3000);
        });
      }
      
      registration.value = await navigator.serviceWorker.ready;
      if (registration.value) {
        const subscription = await registration.value.pushManager.getSubscription();
        isPushEnabled.value = subscription !== null;
        
        // If we should resubscribe after page reload and not already subscribed
        if (shouldResubscribe.value && !isPushEnabled.value) {
          await subscribe();
        }
      }
    } catch (e) {
      console.error('Error checking push status', e);
    }
  }
})

async function togglePush() {
  if (!isPushEnabled.value) {
    // Set flag to resubscribe after reload
    localStorage.setItem('shouldResubscribe', 'true')
    
    // Subscribe and then reload page
    try {
      await subscribe()
      window.location.reload()
    } catch (e) {
      console.error('Error subscribing before reload', e)
      // Clear flag if subscription fails
      localStorage.removeItem('shouldResubscribe')
    }
  } else {
    // Just unsubscribe normally without reload
    await unsubscribe()
  }
}

async function subscribe() {
  if (!vapidPublicKey) {
    console.error('VAPID public key is missing!')
    return
  }

  try {
    const sub = await registration.value.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
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
    throw e
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
  if (!base64String) {
    console.error('VAPID public key is missing');
    return new Uint8Array();
  }

  const base64 = base64String
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const padding = '='.repeat((4 - (base64.length % 4)) % 4);
  const paddedBase64 = base64 + padding;

  try {
    const rawData = window.atob(paddedBase64);
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