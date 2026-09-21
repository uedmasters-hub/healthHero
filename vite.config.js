import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static media lives in public/img and is copied to dist/img by Vite.
// Dev and production both serve /img/... from that folder (no custom middleware).
export default defineConfig({
  plugins: [react()],
})
