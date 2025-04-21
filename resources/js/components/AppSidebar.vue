<script setup lang="ts">
import NavFooter from '@/components/NavFooter.vue';
import NavMain from '@/components/NavMain.vue';
import NavUser from '@/components/NavUser.vue';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '@/components/ui/sidebar';
import { type NavItem } from '@/types';
import { Link, usePage } from '@inertiajs/vue3';
import { BookOpen, Folder, LayoutGrid, Map, Dog, Cctv, Aperture } from 'lucide-vue-next';
import AppLogo from './AppLogo.vue';
import { computed } from 'vue';

//Checking Admin Privileges
const { auth } = usePage().props;
const authUser = computed(() => auth.user || null);
const hasAdminAccess = computed(() => {
    return authUser.value?.permissions?.includes('manage_roles') || 
         authUser.value?.permissions?.includes('manage_users') ||
         authUser.value?.permissions?.includes('manage_referral_codes');
    
});

//Main Navigation Tabs
const mainNavItems: NavItem[] = [
    {
        title: 'Dashboard',
        href: '/dashboard',
        icon: LayoutGrid,
        group: "Analytics"
    },
    {
        title: 'Detections',
        href: '/detections',
        icon: Aperture,
        group: "Analytics"
    },
    {
        title: 'Stray Map',
        href: '/straymap',
        icon: Map,
        group: "Stray Management"
    },
    {
        title: 'Registered Pets',
        href: '/registered-pets',
        icon: Dog,
        group: "Stray Management"
    },
    {
        title: 'Stray Monitor',
        href: '/cctv',
        icon: Cctv,
        group: "Stray Management"
    },
    {
        title: 'User Management',
        href: '/user-management',
        icon: LayoutGrid,
        group: "User Management",
        hidden: !hasAdminAccess.value,
    },
    {
        title: 'Role Management',
        href: '/role-management',
        icon: LayoutGrid,
        group: "User Management",
        hidden: !hasAdminAccess.value,
    }
];

const footerNavItems: NavItem[] = [
    {
        title: 'Github Repo',
        href: 'https://github.com/laravel/vue-starter-kit',
        icon: Folder,
    },
    {
        title: 'Documentation',
        href: 'https://laravel.com/docs/starter-kits',
        icon: BookOpen,
    },
];
</script>

<template>
    <Sidebar collapsible="icon" variant="inset">
        <SidebarHeader>
            <SidebarMenu>
                <SidebarMenuItem>
                    <SidebarMenuButton size="lg" as-child>
                        <Link :href="route('dashboard')">
                            <AppLogo />
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarHeader>

        <SidebarContent>
            <NavMain :items="mainNavItems" />
        </SidebarContent>

        <SidebarFooter>
            <!--<NavFooter :items="footerNavItems" />-->
            <NavUser />
        </SidebarFooter>
    </Sidebar>
    <slot />
</template>
