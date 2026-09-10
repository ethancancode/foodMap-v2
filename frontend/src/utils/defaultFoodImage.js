/**
 * Modern, beautiful SVG graphic representing freshly cooked food in a steaming bowl.
 * Used as the default image across FoodMap when a vendor does not provide a custom photo.
 */
export const DEFAULT_FOOD_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="100%" height="100%">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FFF7ED" />
      <stop offset="50%" stop-color="#FFEDD5" />
      <stop offset="100%" stop-color="#FED7AA" />
    </linearGradient>
    <linearGradient id="bowlGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FFFFFF" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>
    <linearGradient id="curryGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#EA580C" />
      <stop offset="50%" stop-color="#C2410C" />
      <stop offset="100%" stop-color="#9A3412" />
    </linearGradient>
    <linearGradient id="garnishGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#22C55E" />
      <stop offset="100%" stop-color="#15803D" />
    </linearGradient>
  </defs>

  <!-- Background Pattern / Warm Glow -->
  <rect width="800" height="600" fill="url(#bgGrad)" />
  <circle cx="400" cy="360" r="260" fill="#FED7AA" opacity="0.4" />

  <!-- Steam Trails -->
  <g stroke="#F97316" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.6">
    <path d="M340 210 Q325 170 345 130 T335 80" />
    <path d="M400 195 Q380 155 405 115 T395 65" stroke-width="5" opacity="0.8" />
    <path d="M460 210 Q475 170 455 130 T465 80" />
  </g>

  <!-- Table shadow below bowl -->
  <ellipse cx="400" cy="485" rx="220" ry="24" fill="#000000" opacity="0.12" />

  <!-- Bowl Body -->
  <path d="M180 300 C180 440 270 470 400 470 C530 470 620 440 620 300 Z" fill="url(#bowlGrad)" />
  
  <!-- Bowl Rim Lip -->
  <ellipse cx="400" cy="300" rx="220" ry="50" fill="#CBD5E1" />
  
  <!-- Food / Curry Surface Inside Bowl -->
  <ellipse cx="400" cy="300" rx="205" ry="44" fill="url(#curryGrad)" />

  <!-- Rice & Garnish -->
  <ellipse cx="340" cy="295" rx="80" ry="28" fill="#FFFDF5" />
  <ellipse cx="330" cy="290" rx="65" ry="22" fill="#FFFFFF" />

  <!-- Veggie chunks -->
  <circle cx="440" cy="305" r="14" fill="#F97316" />
  <circle cx="480" cy="295" r="11" fill="#DC2626" />
  <circle cx="410" cy="315" r="12" fill="#EAB308" />
  <circle cx="455" cy="320" r="9" fill="#16A34A" />
  <circle cx="360" cy="305" r="8" fill="#FBBF24" />

  <!-- Fresh Herb Leaves -->
  <path d="M380 280 C395 265 415 270 410 285 C405 295 385 290 380 280 Z" fill="url(#garnishGrad)" />
  <path d="M410 285 C425 275 440 285 435 298 C430 305 415 300 410 285 Z" fill="#16A34A" />

  <!-- Ceramic Bowl Highlights -->
  <path d="M210 330 C220 420 290 450 400 450 C410 450 310 435 240 340 Z" fill="#FFFFFF" opacity="0.4" />
  <ellipse cx="400" cy="295" rx="218" ry="48" fill="none" stroke="#FFFFFF" stroke-width="3" opacity="0.6" />
</svg>
`)}`
