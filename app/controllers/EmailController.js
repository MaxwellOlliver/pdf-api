import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Mail from '../../lib/Mail'
import * as Yup from 'yup'

class EmailController {
  async create(request, response) {
    const schema = Yup.object().shape({
      sender: Yup.object().required().shape({
        name: Yup.string().required(),
        logo: Yup.string(),
      }),
      destination: Yup.object().required().shape({
        name: Yup.string().required(),
        email: Yup.string().email().required(),
      }),
      content: Yup.object()
        .required()
        .shape({
          template: Yup.string().required().oneOf(['boleto', 'bradesco']),
          dueDate: Yup.string().required(),
          value: Yup.string().required(),
          templateValues: Yup.object(),
          attachments: Yup.array(Yup.string().required()).required(),
        }),
    })

    try {
      await schema.validate(request.body)
    } catch (error) {
      return response.status(400).json({ error: error.errors.join('. ') })
    }

    const payload = request.body

    Mail.sendMail(
      {
        from: `${payload.sender.name} <${process.env.MAIL_USER}>`,
        to: `${payload.destination.name} <${payload.destination.email}>`,
        subject: payload.content.subject,
        template: payload.content.template,
        context: {
          user: payload.destination.name,
          due_date: payload.content.dueDate,
          process_date: format(new Date(), "dd/MM/yyyy à's' HH:mm'h'", {
            locale: ptBR,
          }),
          value: payload.content.value,
          bank_img: payload.sender.logo || null,
          sender: payload.sender.name || null,
          templateValues: payload.content.templateValues,
        },
      },
      payload.content.attachments.map((att) => ({ href: att }))
    )

    return response.status(202).send()
  }
}

export default new EmailController()
