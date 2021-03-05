import nodemailer from 'nodemailer'
import exphbs from 'express-handlebars'
import nodemailerhbs from 'nodemailer-express-handlebars'
import { resolve } from 'path'
import mailConfig from '../../config/mail'

class Mail {
  constructor() {
    const { secure, auth } = mailConfig
    this.tranporter = nodemailer.createTransport({
      host: 'email-ssl.com.br',
      port: 587,
      secure,
      auth: auth.user ? auth : null,
    })

    this.configureTemplates()
  }

  sendMail(message, attachments) {
    return this.tranporter.sendMail({
      ...mailConfig.default,
      ...message,
      attachments,
    })
  }

  configureTemplates() {
    const viewPath = resolve(__dirname, '..', '..', 'templates', 'emails')

    this.tranporter.use(
      'compile',
      nodemailerhbs({
        viewEngine: exphbs.create({
          layoutsDir: resolve(viewPath, 'layouts'),
          partialsDir: resolve(viewPath, 'partials'),
          extname: '.hbs',
        }),
        viewPath,
        extName: '.hbs',
      })
    )
  }
}

export default new Mail()
