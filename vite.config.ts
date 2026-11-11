import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
export default defineConfig({
  plugins:[react(),tailwind(),VitePWA({registerType:'prompt',includeAssets:['icon.svg'],manifest:{name:'Другая пара — мастерская ухода',short_name:'Другая пара',description:'Личный уход за любимой обувью. Интерактивная демонстрация.',theme_color:'#53634b',background_color:'#f6f5ef',display:'standalone',start_url:'/',icons:[{src:'/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]},workbox:{globPatterns:['**/*.{js,css,html,svg,woff2,jpg,webp,png}'],maximumFileSizeToCacheInBytes:4000000}})],
  test:{environment:'jsdom',setupFiles:['./src/test/setup.ts'],include:['src/**/*.test.{ts,tsx}'],restoreMocks:true},
  build:{chunkSizeWarningLimit:900}
});
