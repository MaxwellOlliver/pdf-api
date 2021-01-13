import 'dotenv/config'
import express, { json } from 'express'

import cors from 'cors'
import routes from './routes'
const app = express()

app.disable('X-Powered-By')

app.use(json())
app.use(cors())
app.use((req, res, next) => {
  req.timeouts = {}
  return next()
})
app.use(routes)

app.listen(process.env.PORT || 3333)
