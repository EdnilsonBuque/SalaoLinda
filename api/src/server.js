import app from './app.js'
import { env } from './config/env.js'

app.listen(env.PORT, () => {
  console.log(`API a correr em http://localhost:${env.PORT} (TZ salão: ${env.SALON_TZ})`)
})
