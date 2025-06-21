import express from 'express';
import cors from 'cors';
import fs from 'fs-extra';
import path from 'path';
import { Storage } from 'megajs';

const app = express();
const port = process.env.PORT || 3000;

const MEGA_EMAIL = process.env.MEGA_EMAIL;
const MEGA_PASSWORD = process.env.MEGA_PASSWORD;

app.use(cors());
app.use(express.json());

async function uploadToMega(localFilePath, remoteFileName) {
  return new Promise((resolve, reject) => {
    const storage = Storage({
      email: MEGA_EMAIL,
      password: MEGA_PASSWORD,
      keepalive: true,
    });

    storage.once('ready', () => {
      const uploadStream = storage.root.uploadFile(remoteFileName);
      const fileStream = fs.createReadStream(localFilePath);
      fileStream.pipe(uploadStream);

      uploadStream.on('end', () => resolve());
      uploadStream.on('error', (err) => reject(err));
    });

    storage.once('error', (err) => reject(err));
  });
}

app.post('/api/paiements', async (req, res) => {
  try {
    const { fullname, numero, devise, montant, code } = req.body;

    if (!fullname || !numero || !devise || !code) {
      return res.status(400).json({ message: "Champs manquants" });
    }

    const timestamp = Date.now();
    const fileName = `paiement-${timestamp}.json`;
    const filePath = path.join(process.cwd(), fileName);

    await fs.writeJson(filePath, { fullname, numero, devise, montant, code, date: new Date() }, { spaces: 2 });
    await uploadToMega(filePath, `paiements/${fileName}`);
    await fs.remove(filePath);

    return res.status(200).json({ message: "Données envoyées à MEGA avec succès" });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erreur lors de l’envoi" });
  }
});

app.listen(port, () => {
  console.log(`Serveur en ligne sur le port ${port}`);
});
