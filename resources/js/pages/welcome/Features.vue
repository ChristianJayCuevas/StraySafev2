<script setup lang="ts">
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  Paintbrush,
  MessageCircle,
  TabletSmartphone,
  Cctv,
  Goal,
  MapPinned,
  BellRing,
  CheckCheck,
  PawPrint,
} from "lucide-vue-next";

interface FeaturesProps {
  icon: string;
  title: string;
  description: string;
}

const featureList: FeaturesProps[] = [
  {
    icon: "pawPrint",
    title: "Classifying Stray Animals",
    description:
      "Instantly identifies strays based on collar or leash detection.",
  },
  {
    icon: "cctv",
    title: "Real-Time Detection",
    description:
      "Live CCTV feed for immediate stray identification.",
  },
  {
    icon: "mapPinned",
    title: "Location Pinning",
    description:
      "Maps stray locations for quick tracking and response.",
  },
  {
    icon: "bellRing",
    title: "Notification System",
    description:
      "Alerts animal pound and pet owners instantly.",
  },
  {
    icon: "tabletSmartphone",
    title: "Web & Mobile App",
    description:
      "Monitor strays and register pets on any device.",
  },
  {
    icon: "checkCheck",
    title: "Feature Matching",
    description:
      "Smart matching to identify registered pets swiftly.",
  },
];

const iconMap: Record<
  string,
  | typeof TabletSmartphone
  | typeof Cctv
  | typeof Goal
  | typeof MapPinned
  | typeof Paintbrush
  | typeof BellRing
  | typeof MessageCircle
  | typeof CheckCheck
  | typeof PawPrint
> = {
  tabletSmartphone: TabletSmartphone,
  cctv: Cctv,
  goal: Goal,
  mapPinned: MapPinned,
  paintbrush: Paintbrush,
  bellRing: BellRing,
  messageCircle: MessageCircle,
  checkCheck: CheckCheck,
  pawPrint: PawPrint
};
</script>

<template>
  <section
    id="features"
    class="w-full max-w-screen-xl mx-auto container py-24 sm:py-32"
  >
    <h2 class="text-lg text-primary text-center mb-2 tracking-wider">
      Features
    </h2>

    <h2 class="text-3xl md:text-4xl text-center font-bold mb-4">
      What Makes Us Different
    </h2>

    <h3 class="md:w-1/2 mx-auto text-xl text-center text-muted-foreground mb-8">
        Using technology to create safer, more compassionate communities.
    </h3>

    <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="{ icon, title, description } in featureList"
        :key="title"
      >
        <Card class="h-full bg-background border-0 shadow-none">
          <CardHeader class="flex justify-center items-center flex-col">
            <div
              class="bg-emerald-500/20 p-2 rounded-full ring-8 ring-emerald-500/10 mb-4"
            >
              <component
                :is="iconMap[icon]"
                class="size-6 text-emerald-500"
              />
            </div>

            <CardTitle>
              {{ title }}
            </CardTitle>
          </CardHeader>

          <CardContent class="text-muted-foreground text-center">
            {{ description }}
          </CardContent>
        </Card>
      </div>
    </div>
  </section>
</template>

<style lang="less" scoped></style>