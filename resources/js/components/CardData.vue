<script setup lang="ts">
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card'
import Icon from '@/components/Icon.vue'
import { defineProps } from 'vue'

defineProps<{
    title: string
    value: number | string
    icon?: string
    description?: string
}>()

</script>
<template>
    <Card class="hover:border-black dark:hover:border-white hover:-translate-y-1 transition-all duration-300 h-[155px] 2xl:h-[180px] py-3 2xl:py-5.5 text-[14px] 2xl:text-[18px]">
        <CardHeader>
            <CardTitle class="flex flex-column items-center justify-between card-text">
                {{ title }}
                <div class="flex items-center justify-center h-8 w-8 rounded-full bg-black dark:bg-white">
                    <Icon :name="icon" class="h-6 w-6 text-white dark:text-black" />
                </div>
            </CardTitle>
        </CardHeader>
        <CardContent class="text-4xl font-bold">
            {{ value }}
        </CardContent>
        <CardFooter>
            <CardDescription>{{ description }}</CardDescription>
        </CardFooter>
    </Card>
</template>
<style scoped>


</style>