import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.dirname(fileURLToPath(import.meta.url))

function serveImgFolder() {
  const imgRoot = path.join(root, 'img')
  const mime = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    webp: 'image/webp',
    gif: 'image/gif',
  }

  return {
    name: 'serve-img-folder',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const raw = req.url?.split('?')[0] || ''
        if (!raw.startsWith('/img/')) return next()
        const filePath = path.resolve(imgRoot, decodeURIComponent(raw.slice('/img/'.length)))
        if (!filePath.startsWith(imgRoot) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
          return next()
        }
        const ext = path.extname(filePath).slice(1).toLowerCase()
        res.setHeader('Content-Type', mime[ext] || 'application/octet-stream')
        fs.createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      const dest = path.join(root, 'dist', 'img')
      fs.cpSync(imgRoot, dest, { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [react(), serveImgFolder()],
})
