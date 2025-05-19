<script setup lang="ts">
import AuthLayout from '@/layouts/auth/AuthSimpleLayout.vue';

defineProps<{
    title?: string;
    description?: string;
    backgroundImage?: string;
}>();
</script>

<template>
    <AuthLayout :title="title" :description="description" :backgroundImage="backgroundImage">
        <slot />
    </AuthLayout>
</template>
