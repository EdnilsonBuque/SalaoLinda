import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import multer from 'multer'
import { httpError } from '../utils/httpError.js'

export const uploadDirectory = path.resolve(process.cwd(), 'uploads')

const extensions = new Map([
  ['image/jpeg', 'jpg'],
  ['image/png', 'png'],
  ['image/webp', 'webp'],
])

const signatures = {
  jpg: (buffer) => buffer.length >= 3
    && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff,
  png: (buffer) => buffer.length >= 8
    && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  webp: (buffer) => buffer.length >= 12
    && buffer.toString('ascii', 0, 4) === 'RIFF'
    && buffer.toString('ascii', 8, 12) === 'WEBP',
}

await fs.mkdir(uploadDirectory, { recursive: true })

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename(req, file, callback) {
      const extension = extensions.get(file.mimetype)
      if (!extension) return callback(httpError(400, 'A fotografia deve estar em formato JPG, PNG ou WebP'))
      callback(null, `${crypto.randomUUID()}.${extension}`)
    },
  }),
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 1,
  },
  fileFilter(req, file, callback) {
    if (!extensions.has(file.mimetype)) {
      return callback(httpError(400, 'A fotografia deve estar em formato JPG, PNG ou WebP'))
    }
    callback(null, true)
  },
}).single('image')

export async function uploadServicePhoto(req, res, next) {
  upload(req, res, async (uploadError) => {
    if (uploadError) {
      return next(uploadError instanceof multer.MulterError && uploadError.code === 'LIMIT_FILE_SIZE'
        ? httpError(413, 'A fotografia não pode exceder 5 MB')
        : uploadError)
    }
    if (!req.file) return next(httpError(400, 'Escolhe uma fotografia'))

    try {
      const extension = path.extname(req.file.filename).slice(1)
      const signatureBuffer = Buffer.alloc(12)
      const handle = await fs.open(req.file.path, 'r')
      try {
        await handle.read(signatureBuffer, 0, signatureBuffer.length, 0)
      } finally {
        await handle.close()
      }

      if (!signatures[extension]?.(signatureBuffer)) {
        await fs.unlink(req.file.path)
        return next(httpError(400, 'O ficheiro enviado não é uma imagem válida'))
      }

      return next()
    } catch (error) {
      await fs.unlink(req.file.path).catch((cleanupError) => {
        console.error('Não foi possível remover uma fotografia inválida:', cleanupError)
      })
      return next(error)
    }
  })
}
