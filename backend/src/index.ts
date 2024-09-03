import express from 'express';
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());

// CORS
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', '*');
  res.header('Access-Control-Allow-Headers', '*');
  next();
});

const uploadsFolder = path.resolve('uploads');
const chunksDir = path.resolve('chunks');

fs.mkdirSync(uploadsFolder, { recursive: true });
fs.mkdirSync(chunksDir, { recursive: true });

app.post('/upload/chunk', async (req, res) => {
  const { 
    'x-total-chunks': totalChunks, 
    'x-current-chunk': currentChunk, 
    'x-original-file-name': originalFileName 
  } = req.headers;

  const chunkIndex = parseInt(String(currentChunk), 10);
  const totalChunksCount = parseInt(String(totalChunks), 10);

  const chunksFolderPath = path.join(chunksDir, String(originalFileName) || '');
  fs.mkdirSync(chunksFolderPath, { recursive: true });

  const chunkPath = path.join(chunksFolderPath, `${chunkIndex}`);
  
  try {
    const writer = fs.createWriteStream(chunkPath);
    req.pipe(writer);

    writer.on('finish', async () => {
      if (chunkIndex === totalChunksCount) {
        await assembleChunks(String(originalFileName), totalChunksCount);
        res.send('File uploaded and assembled successfully');
      } else {
        res.send('Chunk uploaded successfully');
      }
    });

    writer.on('error', (err) => {
      console.error('Error writing chunk:', err);
      res.status(500).send('Error handling chunk');
    });

  } catch (err) {
    console.error('Error handling chunk:', err);
    res.status(500).send('Error handling chunk');
  }
});

async function assembleChunks(filename: string, totalChunks: number) {
  const finalPath = path.join(uploadsFolder, filename);
  
  try {
    const writer = fs.createWriteStream(finalPath);

    for (let i = 1; i <= totalChunks; i++) {
      const chunkPath = path.join(chunksDir, filename, `${i}`);
      const data = fs.readFileSync(chunkPath);
      writer.write(data);
      fs.unlinkSync(chunkPath); // Remove o chunk após ser adicionado ao arquivo final
    }

    writer.end(); // Fecha o stream após todos os chunks serem escritos
    console.log('File assembled successfully');
  } catch (err) {
    console.error('Error assembling file:', err);
  }
}

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});