<script setup lang="ts">
import AppLayout from '@/layouts/AppLayout.vue';
import { Head } from '@inertiajs/vue3';
import { ref } from 'vue';
import { type BreadcrumbItem } from '@/types';
import { Card } from '@/components/ui/card';
import CardAnimal from '@/components/CardAnimal.vue';
import axios from 'axios';

const breadcrumbs: BreadcrumbItem[] = [
    {
        title: 'Detections',
        href: '/detections',
    },
];

const fetchDetectedData = async () => {
    const response = await axios.get('/api/detections');
    const data = response.data;
    return data;
}
</script>

<template>
    <Head title="Detections" />
        <AppLayout :breadcrumbs="breadcrumbs">
            <div class="flex h-full flex-1 flex-col gap-4 rounded-xl p-4 relative z-50">
                <div class='grid auto-rows-min gap-4 md:grid-cols-4 transition-all duration-300'>
                    <CardAnimal title="Animal Pins" imagelink="https://tse1.mm.bing.net/th/id/OIP.F1hR1alVh_aOaIVRAl_HrAHaFj?rs=1&pid=ImgDetMain"/>
                    <CardAnimal title="Animal Pins"  />
                    <CardAnimal title="Total Area"  />
                    <CardAnimal title="Total Area"  />
                </div>
           
            </div>
        </AppLayout>
</template>