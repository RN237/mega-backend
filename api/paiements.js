import express from "express";
import { Storage } from "megajs";
import fs from "fs/promises";
import path from "path";

// Attention : Vercel initialise express dans serverless, pas besoin de `app.listen`
const handler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Méthode non autorisée" });
  }

  const { fullname, numero, devise, montant, code } = req.body;
  if (!fullname || !numero || !devise || !code) {
    return res.status(400).json({ message: "Champs manquants" });
  }

  const email = process.env.MEGA_EMAIL;
  const password = process.env.MEGA_PASSWORD;
  if (!email || !password) {
    return res.status(500).json({ message: "Identifiants MEGA non configurés" });
  }

  const timestamp = Date.now();
  const fileName = `paiement-${timestamp}.json`;
  const filePath = path.join("/tmp", fileName);
  await fs.writeFile(filePath, JSON.stringify({ fullname, numero, devise, montant, code, date: new Date() }, null, 2));

  await new Promise((resolve, reject) => {
    const storage = Storage({ email, password, keepalive: true });
    storage.once("ready", () => {
      const upload = storage.root.uploadFile(`paiements/${fileName}`);
      const read = require("fs").createReadStream(filePath);
      read.pipe(upload);
      upload.on("end", resolve);
      upload.on("error", reject);
    });
    storage.on("error", reject);
  });

  await fs.unlink(filePath);
  return res.status(200).json({ message: "Données envoyées à MEGA avec succès" });
};

export default handler;
