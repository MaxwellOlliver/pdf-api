import differenceInCalendarDays from 'date-fns/differenceInCalendarDays'
import { parseISO, format } from 'date-fns'
import { unlink, existsSync, createReadStream } from 'fs'
import { join } from 'path'
import { ptBR } from 'date-fns/locale'

import { Create } from '../yup-schemas/PdfToBillet'

import { Boletos, Bancos } from '../../lib/gerar-boletos'

import Mail from '../../lib/Mail'

class PdfToBilletController {
  async create(request, response) {
    const { body: payload } = request

    // try {
    //   await Create.validate(request.body)
    // } catch (error) {
    //   return response.status(400).json({ error: error.errors.join(' ') })
    // }

    const filename = `boleto-${payload.dadosboleto.descpf}-${payload.dadosboleto.datvenci}`
    const Banco = Bancos[String(payload.dadosboleto.codbanco).toUpperCase()]

    const instructions = Object.keys(payload.dadosboleto)
      .filter((key) => /^desinstr/g.test(key) && payload.dadosboleto[key])
      .map((inst) => payload.dadosboleto[inst])

    const billet = {
      banco: new Banco(),
      pagador: {
        nome: payload.dadosboleto.nomclien,
        registroNacional: payload.dadosboleto.descpf,
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
        nome: payload.dadosboleto.descodceden,
        cnpj: '04670195000138',
        dadosBancarios: {
          carteira: payload.dadosboleto.descartebanco,
          agencia: payload.dadosboleto.desagenc,
          agenciaDigito: payload.dadosboleto.desagencdv,
          conta: payload.dadosboleto.desconta,
          contaDigito: payload.dadosboleto.descontadv,
          nossoNumero: '0010017547403',
          nossoNumeroDigito: '2',
        },
        endereco: {
          logradouro: 'AL RIO NEGRO',
          bairro: 'ALPHAVILLE',
          cidade: 'BARUERI',
          estadoUF: 'SP',
          cep: '06454000',
        },
      },
      boleto: {
        linhaDigitavel: payload.dadosboleto.linhadigitavel,
        codigoDeBarras: payload.dadosboleto.codigobarra,
        numeroDocumento: payload.dadosboleto.desnumdoc,
        especieDocumento: payload.dadosboleto.desespecdoc,
        valor: payload.dadosboleto.valbolet,
        datas: {
          vencimento: format(
            parseISO(payload.dadosboleto.datvenci),
            'yyyy-MM-dd',
            {
              locale: ptBR,
            }
          ),
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
      unlink(join('..', '..', 'tmp', `${filename}.pdf`), () => { })
      return response.status(400).json({ error: error.message })
    }

    // const adDays = differenceInCalendarDays(
    //   parseISO(payload.dadosboleto.datvenci),
    //   new Date()
    // )
    // const ms = 1000 * 60 * 60 * 24 * adDays

    // request.timeouts[filename] = setTimeout(
    //   () => unlink(join('tmp', `${filename}.pdf`), () => {}),
    //   ms
    // )

    // Mail.sendMail(
    //   {
    //     to: `${payload.dadosboleto.nomcliente} <${payload.dadosboleto.desemail}>`,
    //     subject: 'Seu BOLETO já está disponível!',
    //     template: 'default',
    //     context: {
    //       user: payload.dadosboleto.nomcliente,
    //     },
    //   },
    //   [
    //     {
    //       href: `${process.env.API_URL}/billet/pdf/${filename}.pdf`,
    //     },
    //   ]
    // )

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
    let filename = request.params.filename
    filename = encodeURIComponent(filename)
    const pathName = join(__dirname, '..', '..', 'tmp', `${filename}`)
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
        error: `File with name ${filename} are not in the auto-delete queue`,
      })
    }

    return response.status(204).send()
  }
}

export default new PdfToBilletController()
