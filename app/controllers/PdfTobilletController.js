import differenceInCalendarDays from 'date-fns/differenceInCalendarDays'
import { parseISO } from 'date-fns'
import { unlink, existsSync, createReadStream } from 'fs'
import { join } from 'path'

import { Boletos, Bancos } from '../../lib/gerar-boletos'

import Mail from '../../lib/Mail'

class PdfToBilletController {
  async create(request, response) {
    const { body: payload } = request
    const filename = `boleto-${payload.dadosboleto.descpf}`
    const Banco = Bancos[payload.dadosboleto.codbanco]

    const instructions = Object.keys(payload.dadosboleto)
      .filter((key) => /^desinstr/g.test(key) && payload.dadosboleto[key])
      .map((inst) => payload.dadosboleto[inst])

    const billet = {
      banco: new Banco(),
      pagador: {
        nome: payload.dadosboleto.nomcliente,
        RegistroNacional: payload.desregis,
        endereco: {
          logradouro: payload.dadosboleto.desender,
          bairro: payload.dadosboleto.desbairr,
          cidade: payload.dadosboleto.descidad,
          estadoUF: payload.dadosboleto.desestad,
          cep: payload.dadosboleto.descep,
        },
      },
      instrucoes: instructions,
      beneficiario: {
        nome: 'Empresa Fictícia LTDA',
        cnpj: '43576788000191',
        dadosBancarios: {
          carteira: '09',
          agencia: '0101',
          agenciaDigito: '5',
          conta: '0326446',
          contaDigito: '0',
          nossoNumero: payload.dadosboleto.nossonumero,
          nossoNumeroDigito: '8',
        },
        endereco: {
          logradouro: 'Rua Pedro Lessa, 15',
          bairro: 'Centro',
          cidade: 'Rio de Janeiro',
          estadoUF: 'RJ',
          cep: '20030-030',
        },
      },
      boleto: {
        numeroDocumento: payload.dadosboleto.desnumdoc,
        especieDocumento: payload.dadosboleto.desespecdoc,
        valor: Number(payload.dadosboleto.valbolet),
        datas: {
          vencimento: payload.dadosboleto.datvenci,
          processamento: '02-04-2019',
          documentos: '02-04-2019',
        },
      },
    }

    try {
      const newBillet = new Boletos(billet)
      newBillet.gerarBoleto()
      await newBillet.pdfFile(filename)
    } catch (error) {
      unlink(join('tmp', `${filename}.pdf`), () => {})
      return response.status(400).json({ error: 'Error on generate billet' })
    }

    const adDays = differenceInCalendarDays(
      parseISO(payload.dadosboleto.datvenci),
      new Date()
    )
    const ms = 1000 * 60 * 60 * 24 * adDays

    request.timeouts[filename] = setTimeout(
      () => unlink(join('tmp', `${filename}.pdf`), () => {}),
      ms
    )

    Mail.sendMail(
      {
        to: `${payload.dadosboleto.nomcliente} <${payload.dadosboleto.desemail}>`,
        subject: 'Seu BOLETO já está disponível!',
        template: 'default',
        context: {
          user: payload.dadosboleto.nomcliente,
        },
      },
      [
        {
          href: `${process.env.API_URL}/billet/pdf/${filename}.pdf`,
        },
      ]
    )

    return response.json({
      filename: `${filename}.pdf`,
      openFile: `${process.env.API_URL}/billet/pdf/file/${filename}.pdf`,
      downloadFile: `${process.env.API_URL}/billet/pdf/${filename}.pdf`,
    })
  }

  show(request, response) {
    let filename = request.params.filename
    let stream
    const pathName = join(__dirname, 'tmp', `${filename}`)

    if (existsSync(pathName)) {
      stream = createReadStream(pathName)
    } else {
      return response
        .status(404)
        .json({ error: `File with name ${filename} does not exists` })
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
    const filename = request.params.filename
    const pathName = join(__dirname, 'tmp', `${filename}`)
    let file

    if (existsSync(pathName)) {
      file = pathName
    } else {
      return response
        .status(404)
        .json({ error: `File with name ${filename} does not exists` })
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
    if (request.timeouts[filename]) {
      clearTimeout(request.timeouts[filename])
    } else {
      return response.status(404).json({
        error: `None file with name ${filename} are be in the auto-delete queue`,
      })
    }

    return response.status(204).send()
  }
}

export default new PdfToBilletController()
