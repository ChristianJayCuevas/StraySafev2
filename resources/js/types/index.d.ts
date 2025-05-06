import type { PageProps } from '@inertiajs/core';
import type { LucideIcon } from 'lucide-vue-next';
import type { Config } from 'ziggy-js';

export interface Auth {
    user: User;
}

export interface BreadcrumbItem {
    title: string;
    href: string;
}

export interface NavItem {
    title: string;
    href: string;
    icon?: LucideIcon;
    isActive?: boolean;
    group?: string;
    hidden?: boolean;
}


export interface SharedData extends PageProps {
    name: string;
    quote: { message: string; author: string };
    auth: Auth;
    ziggy: Config & { location: string };
    sidebarOpen: boolean;
}

export interface User {
    id: number;
    name: string;
    email: string;
    avatar?: string;
    email_verified_at: string | null;
    created_at: string;
    updated_at: string;
}

export interface Detection {
    id: number
    name: string
    type: string
    detected_at: string
    image: string
}

export type BreadcrumbItemType = BreadcrumbItem;

export type DrawingMode = 'polygon' | 'line' | 'point'

export type EnableDrawingMode = (type: DrawingMode, zoom?: number | null) => boolean
export type DisableDrawingMode = () => boolean
export type CancelDrawing = () => boolean
export interface CameraPin {
    id: number
    camera_name: string
    hls_url: string
    camera_description: string
    latitude: number
    longitude: number
    direction: number
    user_map_id: number
  }
  
  export interface AnimalPinInput {
    animal_type: string
    stray_status: string
    cameraName: string
  }
  
  export interface AnimalPin {
    id: number
    animal_type: string
    stray_status: string
    latitude: number
    longitude: number
    camera_pin_id?: number
    user_map_id?: number
  }
  