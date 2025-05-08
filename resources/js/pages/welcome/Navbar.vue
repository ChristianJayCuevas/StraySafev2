<script lang="ts" setup>
import { ref } from "vue";
import AppLogo from '@/components/AppLogo.vue';
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@/components/ui/navigation-menu";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

import { ChevronsDown, Menu } from "lucide-vue-next";
import AppearanceButton from "@/components/AppearanceButton.vue";

interface RouteProps {
  href: string;
  label: string;
}

interface FeatureProps {
  title: string;
  description: string;
}

const routeList: RouteProps[] = [
 
  {
    href: "#team",
    label: "Team",
  },
  {
    href: "#contact",
    label: "Contact",
  },
  {
    href: "#faq",
    label: "FAQ",
  },
];

const featureList: FeatureProps[] = [
  {
    title: "Showcase Your Value ",
    description: "Highlight how your product solves user problems.",
  },
  {
    title: "Build Trust",
    description:
      "Leverages social proof elements to establish trust and credibility.",
  },
  {
    title: "Capture Leads",
    description:
      "Make your lead capture form visually appealing and strategically.",
  },
];

const isOpen = ref<boolean>(false);
</script>

<template>
   <header
  class="relative w-[90%] md:w-[70%] lg:w-[75%] lg:max-w-screen-xl top-5 mx-auto sticky border z-40 rounded-2xl flex items-center p-2 bg-card shadow-md shadow-light dark:shadow-dark"
>
  
    <AppLogo />

   
      <!-- Mobile -->
      <div class="flex items-center ml-auto lg:hidden">
        <Sheet v-model:open="isOpen">
          <SheetTrigger as-child>
            <Menu
              @click="isOpen = true"
              class="cursor-pointer"
            />
          </SheetTrigger>
  
          <SheetContent
            side="left"
            class="flex flex-col justify-between rounded-tr-2xl rounded-br-2xl bg-card"
          >
            <div>
              <SheetHeader class="mb-4 ml-4">
                <SheetTitle class="flex items-center">
                  <a
                    href="/"
                    class="flex items-center"
                  >
                      
    <AppLogo />
                  </a>
                </SheetTitle>
              </SheetHeader>
  
              <div class="flex flex-col gap-2">
                <Button
                  v-for="{ href, label } in routeList"
                  :key="label"
                  as-child
                  variant="ghost"
                  class="justify-start text-base"
                >
                  <a
                    @click="isOpen = false"
                    :href="href"
                  >
                    {{ label }}
                  </a>
                </Button>
              </div>
            </div>
  
            <SheetFooter class="flex-col sm:flex-col justify-start items-start">
              <Separator class="mb-2" />
              <AppearanceButton />
              <div class="flex flex-col w-full gap-2 px-4">
  <Button variant="outline" as-child class="w-full">
    <a href="/login">Login</a>
  </Button>
  <Button variant="default" as-child class="w-full">
    <a href="/register">Register</a>
  </Button>
</div> 
            </SheetFooter>
          </SheetContent>
        </Sheet>
      </div>
  
      <!-- Desktop Navigation (Centered) -->
        <!-- Center: Navigation -->
  <div class="hidden lg:flex absolute left-1/2 -translate-x-1/2">
    <NavigationMenu class="mx-auto">
      <NavigationMenuList>
        <NavigationMenuItem>
          <NavigationMenuTrigger class="bg-card text-base">
            Features
          </NavigationMenuTrigger>
          <NavigationMenuContent>
            <div class="grid w-[600px] grid-cols-2 gap-5 p-4">
              <img
                src="https://www.radix-vue.com/logo.svg"
                alt="Beach"
                class="h-full w-full rounded-md object-cover"
              />
              <ul class="flex flex-col gap-2">
                <li
                  v-for="{ title, description } in featureList"
                  :key="title"
                  class="rounded-md p-3 text-sm hover:bg-muted"
                >
                  <p class="mb-1 font-semibold leading-none text-foreground">
                    {{ title }}
                  </p>
                  <p class="line-clamp-2 text-muted-foreground">
                    {{ description }}
                  </p>
                </li>
              </ul>
            </div>
          </NavigationMenuContent>
        </NavigationMenuItem>

        <NavigationMenuItem
          v-for="{ href, label } in routeList"
          :key="label"
        >
          <NavigationMenuLink asChild>
            <Button as-child variant="ghost" class="text-base">
              <a :href="href">
                {{ label }}
              </a>
            </Button>
          </NavigationMenuLink>
        </NavigationMenuItem>
      </NavigationMenuList>
    </NavigationMenu>
  </div>
  
      <div class="hidden lg:flex flex-shrink-0">
        <AppearanceButton />
      </div>
      <div class="hidden lg:flex items-center gap-2 ml-4">
  <Button variant="outline" as-child>
    <a href="/login">Login</a>
  </Button>
  <Button variant="default" as-child>
    <a href="/register">Register</a>
  </Button>
</div>
    </header>
  </template>

<style scoped>
.shadow-light {
  box-shadow: inset 0 0 5px rgba(0, 0, 0, 0.085);
}

.shadow-dark {
  box-shadow: inset 0 0 5px rgba(255, 255, 255, 0.141);
}
</style>