<script setup lang="ts">
import { BRAND_PATHS, BRAND_EYES, BRAND_STROKE_WIDTH, BRAND_EYE_Y, BRAND_EYE_RADIUS } from '@/lib/brand'
</script>

<template>
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width="24"
    height="24"
    fill="none"
    stroke="currentColor"
    :stroke-width="BRAND_STROKE_WIDTH"
    stroke-linecap="round"
    stroke-linejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    <path v-for="d in BRAND_PATHS" :key="d" :d="d" />
    <g fill="currentColor" stroke="none">
      <circle v-for="cx in BRAND_EYES" :key="cx" :cx="cx" :cy="BRAND_EYE_Y" :r="BRAND_EYE_RADIUS" />
    </g>
  </svg>
</template>
