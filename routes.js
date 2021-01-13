import { Router } from 'express'
import PdfTobilletController from './app/controllers/PdfTobilletController'

const app = Router()

app.post('/billet/pdf/generate', PdfTobilletController.create)

app.get('/billet/pdf/file/:filename', PdfTobilletController.show)

app.get('/billet/pdf/:filename', PdfTobilletController.download)

app.put('/billet/pdf/cancel-ad/:filename', PdfTobilletController.edit)

export default app
