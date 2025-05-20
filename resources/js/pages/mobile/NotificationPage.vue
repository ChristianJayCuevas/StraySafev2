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
      image?: string;
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

// New function to format notification body
const formatNotificationBody = (body: string) => {
  if (!body) return '';
  
  // Add line break after "detected"
  let formattedBody = body.replace(/(detected\.?)/gi, '$1<br>');
  
  // Add line break before "Breed:" if it exists and is not already at the start of a line
  formattedBody = formattedBody.replace(/(\s+)(Breed:)/g, '<br>$2');
  
  // Add line break before "Latitude:" if it exists and is not already at the start of a line
  formattedBody = formattedBody.replace(/(\s+)(Latitude:)/g, '<br>$2');
  
  // Add line break before "Longitude:" if it exists and is not already at the start of a line
  formattedBody = formattedBody.replace(/(\s+)(Longitude:)/g, '<br>$2');
  
  // Add line break before "Camera:" if it exists and is not already at the start of a line
  formattedBody = formattedBody.replace(/(\s+)(Camera:)/g, '<br>$2');
  
  // Add line break before "Matched Pet:" if it exists and is not already at the start of a line
  formattedBody = formattedBody.replace(/(\s+)(Matched Pet:)/g, '<br>$2');
  
  return formattedBody;
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
      <div class="container px-4 py-4 md:py-8">
        <!-- Header Section - More stackable on mobile -->
        <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <h1 class="text-2xl md:text-3xl font-bold">Notifications</h1>
          
          <div class="flex flex-wrap items-center gap-2 w-full sm:w-auto">
            <span v-if="unreadCount > 0" class="text-sm flex items-center">
              {{ unreadCount }} unread
              <Badge variant="secondary" class="ml-2">{{ unreadCount }}</Badge>
            </span>
            
            <Button v-if="unreadCount > 0" @click="markAllAsRead" variant="outline" size="sm" class="w-full sm:w-auto mt-1 sm:mt-0">
              Mark all as read
            </Button>
          </div>
        </div>
        
        <!-- Empty State -->
        <div v-if="notifications.data.length === 0" class="py-8 text-center">
          <h2 class="text-lg font-medium text-gray-500">No notifications yet</h2>
          <p class="mt-2 text-sm text-gray-400">When you receive notifications, they will appear here.</p>
        </div>
        
        <!-- Notifications List -->
        <div v-else class="space-y-3">
          <Card v-for="notification in notifications.data" :key="notification.id" 
                :class="{ 'border-l-4 border-l-primary': !notification.is_read }"
                class="shadow-sm">
            <CardHeader class="flex flex-row items-start justify-between space-y-0 pb-2 px-4 pt-4">
              <div>
                <CardTitle class="text-sm font-semibold sm:text-base">{{ notification.title }}</CardTitle>
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
            
            <CardContent class="px-4 py-2">
              <div class="space-y-2">
                <!-- Use v-html with the formatted body -->
                <p class="text-sm" v-html="formatNotificationBody(notification.body)"></p>
                
                <!-- Display image if present - Optimized for mobile -->
                <img 
                  v-if="notification.image" 
                  :src="notification.image" 
                  alt="Notification image" 
                  class="rounded-md w-full max-h-40 object-cover mt-2"
                  loading="lazy"
                />
              </div>
            </CardContent>
            
            <CardFooter class="flex flex-wrap justify-between gap-2 pt-0 px-4 pb-4">
              <Button v-if="notification.action" variant="ghost" size="sm" 
                      @click="$inertia.visit(notification.action)"
                      class="text-xs px-3 py-1 h-8">
                View
              </Button>
              
              <Button v-if="!notification.is_read" variant="ghost" size="sm" 
                      @click="markAsRead(notification.id)"
                      class="text-xs px-3 py-1 h-8">
                Mark as read
              </Button>
              
              <span v-if="notification.is_read && notification.read_at" class="text-xs text-gray-400 self-center">
                Read {{ formatDate(notification.read_at) }}
              </span>
            </CardFooter>
          </Card>
          
          <!-- Touch-friendly Pagination -->
          <Pagination v-if="notifications.last_page > 1" class="mt-4">
            <PaginationContent class="gap-1">
              <PaginationItem v-if="notifications.current_page > 1">
                <PaginationPrevious @click="goToPage(notifications.current_page - 1)" 
                                   class="h-10 w-10" />
              </PaginationItem>
              
              <PaginationItem v-for="page in notifications.last_page" :key="page" 
                              v-show="page === 1 || 
                                     page === notifications.last_page || 
                                     Math.abs(page - notifications.current_page) <= 1">
                <PaginationLink :is-active="page === notifications.current_page" 
                                @click="goToPage(page)"
                                class="h-10 w-10">
                  {{ page }}
                </PaginationLink>
              </PaginationItem>
              
              <PaginationItem v-if="notifications.last_page > 3 && notifications.current_page < notifications.last_page - 1">
                <PaginationEllipsis class="h-10" />
              </PaginationItem>
              
              <PaginationItem v-if="notifications.current_page < notifications.last_page">
                <PaginationNext @click="goToPage(notifications.current_page + 1)" 
                               class="h-10 w-10" />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      </div>
    </AppLayout>
  </div>
</template>