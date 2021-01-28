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
          template: Yup.string().required().oneOf(['boleto']),
          dueDate: Yup.date().required(),
          value: Yup.number().required(),
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
        from: `Equipe ${payload.sender.name} <${process.env.MAIL_USER}>`,
        to: `${payload.destination.name} <${payload.destination.email}>`,
        subject: payload.content.subject,
        template: payload.content.template,
        context: {
          user: payload.destination.name,
          due_date: format(parseISO(payload.content.dueDate), 'dd/MM/yyyy', {
            locale: ptBR,
          }),
          process_date: format(new Date(), "dd/MM/yyyy à's' HH:mm'h'", {
            locale: ptBR,
          }),
          value: Number(payload.content.value).toLocaleString('pt-BR', {
            style: 'currency',
            currency: 'BRL',
          }),
          bank_img: payload.sender.logo || null,
          sender: payload.sender.name || null,
        },
      },
      payload.content.attachments.map((att) => ({ href: att }))
    )

    return response.status(202).send()
  }
}

export default new EmailController()
