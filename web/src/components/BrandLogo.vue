<template>
  <div class="brand-logo" aria-hidden="true">
    <svg viewBox="0 0 64 64" role="img">
      <defs>
        <linearGradient id="logo-blue" x1="8" y1="8" x2="56" y2="56">
          <stop offset="0" stop-color="#2563eb" />
          <stop offset="1" stop-color="#0f766e" />
        </linearGradient>
      </defs>
      <rect class="logo-plate" x="4" y="4" width="56" height="56" rx="14" />
      <path class="logo-route" d="M18 20h17c7 0 11 4 11 10s-4 10-11 10H18" />
      <path class="logo-route accent" d="M46 44H29c-7 0-11-4-11-10s4-10 11-10h17" />
      <path class="logo-arrow" d="M39 14l7 6-7 6" />
      <path class="logo-arrow accent" d="M25 50l-7-6 7-6" />
    </svg>
  </div>
</template>

<style scoped>
.brand-logo {
  display: grid;
  place-items: center;
  width: 58px;
  height: 58px;
  flex: 0 0 auto;
}

.brand-logo svg {
  width: 100%;
  height: 100%;
  filter: drop-shadow(0 14px 26px rgba(37, 99, 235, 0.18));
}

.logo-plate {
  fill: var(--surface-strong);
  stroke: var(--surface-border);
  stroke-width: 1.5;
}

.logo-route {
  fill: none;
  stroke: url(#logo-blue);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 7;
}

.logo-route.accent {
  stroke-width: 5;
  opacity: 0.62;
}

.logo-arrow {
  fill: none;
  stroke: var(--accent);
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 4.5;
}

.logo-arrow.accent {
  stroke: var(--accent-2);
}

@media (max-width: 767px) {
  .brand-logo {
    width: 48px;
    height: 48px;
  }
}
</style>
