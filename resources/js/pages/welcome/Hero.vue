<script setup lang="ts">
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-vue-next";
</script>

<template>
  <section class="w-full max-w-screen-xl mx-auto px-4 py-20 md:py-32">
    <div class="grid place-items-center gap-8">
      <div class="text-center space-y-8">
        <Badge variant="outline" class="text-sm py-2 rounded-2xl">
          <span class="mr-2 text-primary">
            <Badge class="rounded-2xl">new</Badge>
          </span>
          <span> Version 2 is out now! </span>
        </Badge>

        <div class="max-w-screen-md mx-auto text-center text-5xl md:text-6xl font-bold">
          <h1>
            Help Create a Safer World for
            <span class="text-transparent bg-gradient-to-r from-blue-500 via-sky-400 to-emerald-400 bg-clip-text">
  Stray Animals
</span>


            with StraySafe
          </h1>
        </div>

        <p class="max-w-screen-sm mx-auto text-xl text-muted-foreground">
            StraySafe empowers communities to protect, report, and reunite lost animals with their owners — through live CCTV, AI detection, and local action.
        </p>

        <div class="space-y-4 md:space-y-0 md:space-x-4">
          <Button class="w-5/6 md:w-1/4 font-bold group/arrow">
            Get Started
            <ArrowRight class="size-5 ml-2 group-hover/arrow:translate-x-1 transition-transform" />
          </Button>

          <Button as-child variant="secondary" class="w-5/6 md:w-1/4 font-bold">
            <a href="https://github.com/leoMirandaa/shadcn-vue-landing-page.git" target="_blank">
              Github repository
            </a>
          </Button>
        </div>
      </div>

      <div class="relative group mt-14 w-full z-0">
        <!-- gradient shadow -->
        <div class="absolute -top-6 right-12 w-[90%] h-12 lg:h-[80%] bg-emerald-400 blur-3xl rounded-full img-shadow-animation z-[-1]"></div>

        <!-- Light mode image -->
        <img
          src="/storage/images/hero-image-light.png"
          alt="dashboard using shadcn-vue"
          class="w-full rounded-lg border border-t-2 border-t-primary/30 img-border-animation dark:hidden"
        />

        <!-- Dark mode image -->
        <img
          src="/storage/images/hero-image-dark.png"
          alt="dashboard using shadcn-vue"
          class="w-full rounded-lg border border-t-2 border-t-primary/30 img-border-animation hidden dark:block"
        />

        <!-- gradient effect -->
        <div class="absolute bottom-0 left-0 w-full h-20 md:h-28 bg-gradient-to-b from-background/0 via-background/50 to-background rounded-lg"></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.img-shadow-animation {
  animation: img-shadow-animation 2s linear infinite alternate;
}

.img-border-animation {
  animation: img-border-animation 2s linear infinite alternate;
}

@keyframes img-shadow-animation {
  from {
    opacity: 0.5;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0px);
  }
}

@keyframes img-border-animation {
  from {
    border-top-color: rgba(59, 130, 246, 0.1);
  }
  to {
    border-top-color: rgba(59, 130, 246, 0.6);
  }
}
</style>
