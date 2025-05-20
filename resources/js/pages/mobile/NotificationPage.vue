<script setup lang="ts">
import { Head, Link } from '@inertiajs/vue3';
import { ref, computed } from 'vue';
import axios from 'axios';
import { toast } from 'vue-sonner';
import AppLayout from '@/layouts/MobileAppLayout.vue';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Pagination, PaginationContent, PaginationEllipsis, PaginationItem, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Badge } from '@/components/ui/badge';

// Define props with proper type
const props = defineProps<{
  notifications: {
    data: Array<{
      id: number;
      title: string;
      body: string;
      created_at: string;
      read_at?: string | null;
      is_read: boolean;
      is_broadcast: boolean;
      action?: string;
    }>;
    current_page: number;
    last_page: number;
  };
}>();

const notifications = ref(props.notifications);

const unreadCount = computed(() =>
  notifications.value.data.filter(notification => !notification.is_read).length
);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short'
  }).format(date);
};

const markAsRead = async (id: number) => {
  try {
    await axios.post(`/notifications/${id}/mark-read`);
    const index = notifications.value.data.findIndex(n => n.id === id);
    if (index !== -1) {
      notifications.value.data[index].is_read = true;
      notifications.value.data[index].read_at = new Date().toISOString();
    }
    toast.success("Notification marked as read");
  } catch (error) {
    console.error("Error marking notification as read:", error);
    toast.warning("Failed to mark notification as read");
  }
};

const markAllAsRead = async () => {
  try {
    await axios.post('/notifications/mark-all-read');
    notifications.value.data.forEach(n => {
      n.is_read = true;
      n.read_at = new Date().toISOString();
    });
    toast.success("All notifications marked as read");
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    toast.warning("Failed to mark all notifications as read");
  }
};

const goToPage = (page: number) => {
  window.location.href = `/notifications?page=${page}`;
};
</script>

<template>
  <div>
    <Head title="Notifications" />
    <AppLayout>
    
    <div class="container py-8">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold">Notifications</h1>
        
        <div class="flex items-center gap-4">
          <span v-if="unreadCount > 0" class="text-sm">
            {{ unreadCount }} unread
            <Badge variant="secondary">{{ unreadCount }}</Badge>
          </span>
          
          <Button v-if="unreadCount > 0" @click="markAllAsRead" variant="outline" size="sm">
            Mark all as read
          </Button>
        </div>
      </div>
      
      <div v-if="notifications.data.length === 0" class="py-12 text-center">
        <h2 class="text-xl font-medium text-gray-500">No notifications yet</h2>
        <p class="mt-2 text-gray-400">When you receive notifications, they will appear here.</p>
      </div>
      
      <div v-else class="space-y-4">
        <Card v-for="notification in notifications.data" :key="notification.id" 
              :class="{ 'border-l-4 border-l-primary': !notification.is_read }">
          <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-2">
            <div>
              <CardTitle class="text-base">{{ notification.title }}</CardTitle>
              <CardDescription class="text-xs">
                {{ formatDate(notification.created_at) }}
                <span v-if="notification.is_broadcast" class="ml-2 text-xs font-medium text-blue-500">
                  Broadcast
                </span>
              </CardDescription>
            </div>
            <div v-if="!notification.is_read">
              <Badge variant="secondary" class="h-2 w-2 rounded-full bg-blue-500"></Badge>
            </div>
          </CardHeader>
          
          <CardContent>
            <p class="text-sm">{{ notification.body }}</p>
          </CardContent>
          
          <CardFooter class="flex justify-between pt-0">
            <Button v-if="notification.action" variant="ghost" size="sm" 
                    @click="$inertia.visit(notification.action)">
              View
            </Button>
            
            <Button v-if="!notification.is_read" variant="ghost" size="sm" 
                    @click="markAsRead(notification.id)">
              Mark as read
            </Button>
            
            <span v-if="notification.is_read && notification.read_at" class="text-xs text-gray-400">
              Read {{ formatDate(notification.read_at) }}
            </span>
          </CardFooter>
        </Card>
        
        <Pagination v-if="notifications.last_page > 1" class="mt-6">
          <PaginationContent>
            <PaginationItem v-if="notifications.current_page > 1">
              <PaginationPrevious @click="goToPage(notifications.current_page - 1)" />
            </PaginationItem>
            
            <PaginationItem v-for="page in notifications.last_page" :key="page" 
                            v-show="page === 1 || 
                                   page === notifications.last_page || 
                                   Math.abs(page - notifications.current_page) <= 1">
              <PaginationLink :is-active="page === notifications.current_page" 
                              @click="goToPage(page)">
                {{ page }}
              </PaginationLink>
            </PaginationItem>
            
            <PaginationItem v-if="notifications.current_page < notifications.last_page">
              <PaginationNext @click="goToPage(notifications.current_page + 1)" />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
</AppLayout>
  </div>
</template>