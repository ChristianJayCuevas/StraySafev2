<script setup lang=ts>
import AppLayout from '@/layouts/MobileAppLayout.vue';
import Map from '@/components/map/Map.vue';
</script>
<template>
    <AppLayout>
        <Map :control="false" 
  :currentMap="false" 
  :selectMap="false" 
  :legend="false"
  :heatmap="false" 
  :mobile="true"/>
    </AppLayout>
</template>