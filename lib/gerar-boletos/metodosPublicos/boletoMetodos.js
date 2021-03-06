const fs = require('fs')
const Boleto = require('../utils/functions/boletoUtils')
const BoletoStringify = require('../stringify/boletoStringify')

module.exports = class Boletos {
  constructor({ banco, pagador, boleto, beneficiario, instrucoes }) {
    this.banco = banco
    this.pagador = pagador
    this.boleto = boleto
    this.beneficiario = beneficiario
    this.instrucoes = instrucoes
    this.boletoInfo
    this.systemInteract = boleto.systemInteract
  }

  gerarBoleto() {
    const dataInstance = Boleto.Datas
    const { datas, valor, especieDocumento, numeroDocumento } = this.boleto

    this.boletoInfo = Boleto.Boleto.novoBoleto()
      .comDatas(
        dataInstance
          .novasDatas()
          .comVencimento(datas.vencimento, 'brl')
          .comProcessamento(datas.processamento, 'brl')
          .comDocumento(datas.documentos, 'brl')
      )
      .comBeneficiario(BoletoStringify.createBeneficiario(this.beneficiario))
      .comPagador(BoletoStringify.createPagador(this.pagador))
      .comBanco(this.banco)
      .comCodigoDeBarras(this.boleto.codigoDeBarras)
      .comValorBoleto(parseFloat(valor).toFixed(2))
      .comNumeroDoDocumento(numeroDocumento)
      .comEspecieDocumento(especieDocumento)
      .comInstrucoes(BoletoStringify.createInstrucoes(this.instrucoes))
  }

  pdfFile(filename) {
    const dir = './tmp'
    if (!fs.existsSync(dir)) fs.mkdirSync(dir)
    const stream = fs.createWriteStream(`${dir}/${filename}.pdf`)

    return new Promise((resolve) =>
      new Boleto.Gerador(this.boletoInfo)
        .gerarPDF({
          creditos: '',
          stream,
          systemInteract: this.systemInteract
        })
        .then(() => resolve({ boleto: this.boleto, stream }))
    )
  }

  pdfStream(stream) {
    return new Promise((resolve) =>
      new Boleto.Gerador(this.boletoInfo)
        .gerarPDF({
          creditos: '',
          stream,
        })
        .then(() => resolve({ boleto: this.boleto, stream }))
    )
  }
}
