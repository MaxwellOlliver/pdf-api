import { Router } from 'express'
import PdfTobilletController from './app/controllers/PdfTobilletController'
import EmailController from './app/controllers/EmailController'
import CodeStartController from './app/controllers/CodeStartController'

const app = Router()

app.post('/billet/pdf/generate', PdfTobilletController.create)

app.get('/billet/pdf/file/:filename', PdfTobilletController.show)

app.get('/billet/pdf/:filename', PdfTobilletController.download)

app.put('/billet/pdf/cancelad/:filename', PdfTobilletController.edit)

app.delete('/billet/pdf/clear', PdfTobilletController.delete)

app.post('/email/send', EmailController.create)

app.post('/code-start', CodeStartController.store)

export default app
