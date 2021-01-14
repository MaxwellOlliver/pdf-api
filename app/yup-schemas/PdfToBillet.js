import * as Yup from 'yup'

export const Create = Yup.object().shape({
  banco: Yup.string().required(),
  pagador: Yup.object()
    .required()
    .shape({
      nome: Yup.string(),
      cpf: Yup.string(),
      logradouro: Yup.string(),
      bairro: Yup.string(),
      cidade: Yup.string(),
      uf: Yup.string().max(2),
      cep: Yup.string(),
    }),
  beneficiario: Yup.object()
    .required()
    .shape({
      nome: Yup.string(),
      cnpj: Yup.string(),
      carteira: Yup.string().required(),
      agencia: Yup.string().required(),
      agenciaDigito: Yup.string().required(),
      conta: Yup.string().required(),
      contaDigito: Yup.string().required(),
      nossoNumero: Yup.string().required(),
      nossoNumeroDigito: Yup.string().required(),
      logradouro: Yup.string(),
      bairro: Yup.string(),
      cidade: Yup.string(),
      uf: Yup.string().max(2),
      cep: Yup.string(),
    }),
  boleto: {
    numeroDocumento: Yup.string().required(),
    especieDocumento: Yup.string().required(),
    valor: Yup.string().required(),
    datas: {
      vencimento: Yup.date().required(),
      processamento: Yup.date().required(),
      documentos: Yup.date().required(),
    },
  },
})
