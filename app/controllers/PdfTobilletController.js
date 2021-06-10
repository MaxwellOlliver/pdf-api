import differenceInCalendarDays from 'date-fns/differenceInCalendarDays'
import { parseISO, format, isBefore, addDays } from 'date-fns'
import { unlink, existsSync, createReadStream, readdir } from 'fs'
import { join } from 'path'
import { ptBR } from 'date-fns/locale'

import { Create } from '../yup-schemas/PdfToBillet'

import { Boletos, Bancos } from '../../lib/gerar-boletos'

import Mail from '../../lib/Mail'
import { promisify } from 'util'
import axios from 'axios'

const timeouts = {}

class PdfToBilletController {
  async create(request, response) {
    const { body: payload } = request

    try {
      await Create.validate(request.body)
    } catch (error) {
      return response.status(400).json({ error: error.errors.join('. ') })
    }
    const Bank = Bancos[String(payload.bank).toUpperCase()]

    if (!Bank) {
      return response.status(400).json({ error: 'Unsuported bank' })
    }

    const filename = `boleto-${payload.payer.cpf}-${payload.billet.dates.due}`

    const billet = {
      banco: new Bank(),
      pagador: {
        nome: payload.payer.name,
        registroNacional: payload.payer.cpf,
        endereco: {
          logradouro: payload.payer.address,
          bairro: payload.payer.neighborhood,
          cidade: payload.payer.city,
          estadoUF: payload.payer.stateUf,
          cep: payload.payer.cep,
        },
      },
      instrucoes: payload.billet.instructions,
      beneficiario: {
        nome: payload.recipient.name,
        cnpj: payload.recipient.cnpj,
        dadosBancarios: {
          carteira: payload.recipient.bankWallet,
          agencia: payload.recipient.agency,
          agenciaDigito: payload.recipient.agencyDigit,
          conta: payload.recipient.account,
          contaDigito: payload.recipient.accountDigit,
          nossoNumero: payload.recipient.nossoNumero,
          nossoNumeroDigito: payload.recipient.nossoNumeroDigit,
        },
        endereco: {
          logradouro: payload.recipient.address,
          bairro: payload.recipient.neighborhood,
          cidade: payload.recipient.city,
          estadoUF: payload.recipient.stateUf,
          cep: payload.recipient.cep,
        },
      },
      boleto: {
        codigoDeBarras: payload.billet.barCode,
        numeroDocumento: payload.billet.docNumber,
        especieDocumento: payload.billet.docSpecie,
        valor: payload.billet.value,
        datas: {
          vencimento: format(parseISO(payload.billet.dates.due), 'yyyy-MM-dd', {
            locale: ptBR,
          }),
          processamento: format(new Date(), 'yyyy-MM-dd', {
            locale: ptBR,
          }),
          documentos: format(new Date(), 'yyyy-MM-dd', {
            locale: ptBR,
          }),
        },
      },
    }

    try {
      const newBillet = new Boletos(billet)
      newBillet.gerarBoleto()
      await newBillet.pdfFile(filename)
    } catch (error) {
      unlink(join('..', '..', 'tmp', `${filename}.pdf`), () => {})
      return response.status(400).json({ error: error.message })
    }

    const adDays = differenceInCalendarDays(
      addDays(parseISO(payload.billet.dates.due), 1),
      new Date()
    )

    let ms

    if (adDays === 0) {
      ms = 86400000 // 3 hours
    } else if (adDays < 0) {
      ms = 10800000 // 1 hour
    } else {
      ms = 1000 * 60 * 60 * 24 * adDays
    }

    timeouts[filename + '.pdf'] = setTimeout(
      () => promisify(unlink)(join('tmp', `${filename}.pdf`)),
      ms
    )

    if (payload.sendEmail.payerEmail) {
      Mail.sendMail(
        {
          from: `Equipe ${payload.sendEmail.sender} <${process.env.MAIL_USER}>`,
          to: `${payload.payer.name} <${payload.sendEmail.payerEmail}>`,
          subject: 'Aqui está o BOLETO que você pediu!',
          template: 'boleto',
          context: {
            user: payload.payer.name,
            due_date: format(parseISO(payload.billet.dates.due), 'dd/MM/yyyy', {
              locale: ptBR,
            }),
            process_date: format(new Date(), "dd/MM/yyyy à's' HH:mm'h'", {
              locale: ptBR,
            }),
            value: Number(payload.billet.value).toLocaleString('pt-BR', {
              style: 'currency',
              currency: 'BRL',
            }),
            bank_img: payload.sendEmail ? payload.sendEmail.logo : null,
            sender: payload.sendEmail ? payload.sendEmail.sender : null,
          },
        },
        [
          {
            href: `${process.env.API_URL}/billet/pdf/${filename}.pdf`,
          },
        ]
      )
    }

    axios.delete(`${process.env.API_URL}/billet/pdf/clear`)

    return response.json({
      filename: `${filename}.pdf`,
      openFile: `${process.env.API_URL}/billet/pdf/file/${filename}.pdf`,
      downloadFile: `${process.env.API_URL}/billet/pdf/${filename}.pdf`,
    })
  }

  show(request, response) {
    let filename = request.params.filename
    let stream
    const pathName = join(__dirname, '..', '..', 'tmp', `${filename}`)

    if (existsSync(pathName)) {
      stream = createReadStream(pathName)
    } else {
      return response.sendFile(
        join(__dirname, '..', '..', 'public', '404.html')
      )
    }

    filename = encodeURIComponent(filename)

    response.setHeader(
      'Content-disposition',
      'inline; filename="' + filename + '"'
    )
    response.setHeader('Content-type', 'application/pdf')

    stream.pipe(response)
  }

  download(request, response) {
    let filename = request.params.filename
    filename = encodeURIComponent(filename)
    const pathName = join(__dirname, '..', '..', 'tmp', `${filename}`)
    let file

    if (existsSync(pathName)) {
      file = pathName
    } else {
      return response.sendFile(
        join(__dirname, '..', '..', 'public', '404.html')
      )
    }

    response.setHeader('Content-Type', 'application/pdf')
    response.setHeader(
      'Content-Disposition',
      `attachment; filename=${filename}`
    )

    return response.download(file)
  }

  edit(request, response) {
    const filename = request.filename
    if (timeouts[filename]) {
      clearTimeout(timeouts[filename])
      timeouts[filename] = undefined
    } else {
      return response.status(404).json({
        error: `File with name ${filename} are not in the auto-delete queue`,
      })
    }

    return response.status(204).send()
  }

  async delete(request, response) {
    const files = await promisify(readdir)(join(__dirname, '..', '..', 'tmp'))

    const oldFiles = files.map((filename) => {
      if (
        !/^boleto-([0-9]{11})-([0-9]{4})-([0-9]{2})-([0-9]{2}).pdf/.test(
          filename
        )
      ) {
        return response
          .status(400)
          .json({ error: 'Filename does not match with filename partner' })
      }
      const subDate = /([0-9]{4})-([0-9]{2})-([0-9]{2})/g.exec(filename)[0]
      const fileIsBefore = isBefore(parseISO(subDate), new Date())
      if (fileIsBefore) {
        return filename
      }
    })

    oldFiles.forEach((filename) => {
      if (!filename) return
      const dir = join(__dirname, '..', '..', 'tmp', filename)

      if (existsSync(dir) && !timeouts[filename]) {
        promisify(unlink)(dir)
      }
    })

    return response.json({
      deletedFiles: oldFiles,
    })
  }
}

export default new PdfToBilletController()
