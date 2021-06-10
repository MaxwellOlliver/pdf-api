import 'dotenv/config'
import express, { json } from 'express'

import cors from 'cors'
import routes from './routes'
const app = express()

app.disable('x-powered-by')

app.use(json())
app.use(cors({
  origin: '*'
}))
app.use(routes)

app.listen(process.env.PORT || 3333)
