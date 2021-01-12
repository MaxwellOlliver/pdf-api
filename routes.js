const { Router } = require('express');

const fs = require('fs');
const path = require('path');

const { Boletos } = require('./lib/gerar-boletos');
const boleto = require('./example');

const { v4 } = require('uuid');

const app = Router();

app.post('/billet/pdf/generate', async (request, response) => {
  const newBillet = new Boletos(boleto);
  const filename = v4();
  newBillet.gerarBoleto();

  await newBillet.pdfFile(filename);

  // setTimeout(
  //   () => fs.unlink(path.join('tmp', `${filename}.pdf`), () => {}),
  //   10000
  // );

  return response.json({
    filename: filename + '.pdf',
    fileUri: `${process.env.API_URL}/pdf/${filename}.pdf`,
    viewFile: `${process.env.API_URL}/pdf/view/${filename}.pdf`,
  });
});

app.get('/billet/pdf/file/:filename', (request, response) => {
  let filename = request.params.filename;
  let stream;
  const pathName = path.join(__dirname, 'tmp', `${filename}`);

  if (fs.existsSync(pathName)) {
    stream = fs.createReadStream(pathName);
  } else {
    return response
      .status(400)
      .json({ error: `File with name ${filename} does not exists` });
  }

  filename = encodeURIComponent(filename);

  response.setHeader(
    'Content-disposition',
    'inline; filename="' + filename + '"'
  );
  response.setHeader('Content-type', 'application/pdf');

  stream.pipe(response);
});

app.get('/billet/pdf/:filename', (request, response) => {
  const filename = request.params.filename;
  const pathName = path.join(__dirname, 'tmp', `${filename}`);
  let file;

  if (fs.existsSync(pathName)) {
    file = pathName;
  } else {
    return response
      .status(400)
      .json({ error: `File with name ${filename} does not exists` });
  }

  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader('Content-Disposition', `attachment; filename=${filename}`);

  return response.download(file);
});

module.exports = app;
