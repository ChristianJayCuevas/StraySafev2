<script setup lang="ts">
import Navbar from "./welcome/Navbar.vue";
import Hero from "./welcome/Hero.vue";
import Features from "./welcome/Features.vue";
import Autoplay from 'embla-carousel-autoplay';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Button } from '@/components/ui/button';

// Images for carousel - replace with your actual image paths
const carouselImages = [
  'https://github.com/ChristianJayCuevas/StraySafe-MobileApp/blob/main/assets/welcome1.png?raw=true',
  'https://github.com/ChristianJayCuevas/StraySafe-MobileApp/blob/main/assets/welcome2.png?raw=true',
  'https://github.com/ChristianJayCuevas/StraySafe-MobileApp/blob/main/assets/welcome3.png?raw=true',
  'https://github.com/ChristianJayCuevas/StraySafe-MobileApp/blob/main/assets/welcome4.jpg?raw=true',
  'https://github.com/ChristianJayCuevas/StraySafe-MobileApp/blob/main/assets/welcome5.jpg?raw=true',
];

// Set up autoplay plugin
const plugin = Autoplay({
  delay: 3000,
  stopOnInteraction: false,
});
</script>

<template>
  <!-- Mobile Carousel (md and below) -->
  <div class="md:hidden relative w-full h-screen overflow-hidden">
    <!-- Static title overlay - positioned above the carousel -->
   <div class="absolute inset-0 z-20 flex flex-col justify-center items-center text-white p-6 text-center">
  <h2 class="text-5xl font-bold mb-4">Welcome to Stray Safe</h2>
  <p class="text-lg mb-6">Discover amazing features and services</p>
</div>
    
    <Carousel
      class="w-full h-full"
      :plugins="[plugin]"
      @mouseenter="plugin.stop"
      @mouseleave="plugin.play()"
    >
      <CarouselContent>
        <CarouselItem v-for="(image, index) in carouselImages" :key="index" class="h-screen">
          <div class="relative w-full h-full">
            <img 
              :src="image" 
              :alt="`Slide ${index + 1}`" 
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-black/40">
              <!-- Removed the title from here -->
            </div>
          </div>
        </CarouselItem>
      </CarouselContent>
    
    </Carousel>
    
    <!-- Floating buttons for Login/Register -->
    <div class="absolute bottom-35 left-1/2 transform -translate-x-1/2 flex flex-row gap-3 z-10">
      <Button variant="secondary" size="xl" >
        <a href="/mobilelogin" class="text-xl">Login</a>
      </Button>
      <Button variant="default" size="xl" @click="">
        <a href="/mobileregister" class="text-xl">Register</a>
      </Button>
    </div>
    
    <!-- Optional: Carousel indicators -->
    <div class="absolute bottom-24 left-0 right-0 flex justify-center gap-2 z-10">
      <div v-for="(_, index) in carouselImages" :key="`dot-${index}`" 
           class="w-2 h-2 rounded-full bg-white/50 cursor-pointer"></div>
    </div>
  </div>
  
  <!-- Desktop View (md and above) -->
  <div class="hidden md:block">
    <Navbar />
    <Hero />
    <Features />
  </div>
</template>