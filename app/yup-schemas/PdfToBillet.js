import * as Yup from 'yup'

export const Create = Yup.object().shape({
  bank: Yup.string().required(),
  sendEmail: Yup.object().shape({
    payerEmail: Yup.string().email(),
    logo: Yup.string().when('payerEmail', (payerEmail, field) => {
      payerEmail ? field.required() : field
    }),
    sender: Yup.string().when('payerEmail', (payerEmail, field) => {
      payerEmail ? field.required() : field
    }),
  }),
  payer: Yup.object()
    .required()
    .shape({
      name: Yup.string().required(),
      cpf: Yup.string().required(),
      address: Yup.string().required(),
      neighborhood: Yup.string().required(),
      city: Yup.string().required(),
      stateUf: Yup.string().max(2).min(2).required(),
      cep: Yup.string().required(),
    }),
  recipient: Yup.object()
    .required()
    .shape({
      name: Yup.string().required(),
      cnpj: Yup.string().required(),
      bankWallet: Yup.string().required(),
      agency: Yup.string().required(),
      agencyDigit: Yup.string().required(),
      account: Yup.string().required(),
      accountDigit: Yup.string().required(),
      nossoNumero: Yup.string().required(),
      nossoNumeroDigit: Yup.string().required(),
      address: Yup.string().required(),
      neighborhood: Yup.string().required(),
      city: Yup.string().required(),
      stateUf: Yup.string().max(2).required(),
      cep: Yup.string().required(),
    }),
  billet: Yup.object()
    .required()
    .shape({
      isSystemInteract: Yup.boolean(),
      barCode: Yup.string(),
      docNumber: Yup.string().required(),
      docSpecie: Yup.string().required(),
      value: Yup.string().required(),
      instructions: Yup.array(Yup.string()),
      dates: Yup.object().required().shape({
        due: Yup.date().required(),
      }),
    }),
})
