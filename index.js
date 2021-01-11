const express = require('express');

const fs = require('fs');
const path = require('path');

const { Boletos } = require('./lib/gerar-boletos');
const boleto = require('./example');
const { v4 } = require('uuid');

const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());

app.post('/generate-pdf', async (request, response) => {
  const novoBoleto = new Boletos(boleto);
  const filename = v4();
  novoBoleto.gerarBoleto();

  await novoBoleto.pdfFile(filename);

  return response.json({
    filename: filename + '.pdf',
    fileUri: `${process.env.API_URL}/pdf/${filename}`,
    viewFile: `${process.env.API_URL}/pdf/view/${filename}`,
  });
});

app.get('/pdf/view/:filename', (request, response) => {
  let filename = request.params.filename;
  let stream;
  const pathName = path.join(__dirname, 'tmp', `${filename}.pdf`);

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

app.get('/pdf/:filename', (request, response) => {
  const filename = request.params.filename;
  const pathName = path.join(__dirname, 'tmp', `${filename}.pdf`);
  let file;

  if (fs.existsSync(pathName)) {
    file = pathName;
  } else {
    return response
      .status(400)
      .json({ error: `File with name ${filename} does not exists` });
  }

  response.setHeader('Content-Type', 'application/pdf');
  response.setHeader(
    'Content-Disposition',
    `attachment; filename=${filename}.pdf`
  );

  return response.download(file);
});
app.listen(process.env.PORT);
