// server.js
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');

const { uploadFile, getFileUrl } = require('./utils/drive');
const { hashPassword, verifyPassword } = require('./utils/security');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'YourAdminPassHere';

const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const upload = multer({ dest: uploadFolder });

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Load metadata
const metadataPath = path.join(__dirname, 'data', 'metadata.json');
let metadata = [];
if (fs.existsSync(metadataPath)) {
  metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
}

// --- Upload Route ---
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const username = req.body.username || "Anonymous";
    const password = req.body.password || Math.random().toString(36).slice(2, 8); // optional password
    const passwordHash = await hashPassword(password);

    // Upload to Google Drive
    const fileId = await uploadFile(req.file);
    const url = `https://drive.google.com/uc?id=${fileId}&export=download`;

    // Save metadata
    metadata.push({
      username,
      filename: req.file.originalname,
      passwordHash,
      fileId
    });
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Return JSON
    res.json({ url, message: `File uploaded successfully! Access password: ${password}` });

    // Clean local upload
    fs.unlinkSync(req.file.path);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed", details: err.message });
  }
});

// --- Public Files Page Access ---
app.post("/access-file", express.json(), async (req, res) => {
  try {
    const { filename, password } = req.body;
    const fileMeta = metadata.find(m => m.filename === filename);
    if (!fileMeta) return res.status(404).json({ error: "File not found" });

    const valid = await verifyPassword(password, fileMeta.passwordHash);
    if (!valid) return res.status(403).json({ error: "Invalid password" });

    const url = `https://drive.google.com/uc?id=${fileMeta.fileId}&export=download`;
    res.json({ url });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to access file" });
  }
});

// --- Admin Dashboard ---
app.get('/admin', (req, res) => {
  const password = req.query.password;
  if (password !== ADMIN_PASSWORD) return res.status(403).send("Forbidden: Invalid password");

  let html = `<style>
    body { background-color: #121212; color: #eee; font-family: sans-serif; padding: 20px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 10px; border-bottom: 1px solid #333; text-align: left; }
    a { color: #1e90ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    </style>
    <h1>Uploaded Files</h1>
    <table>
    <tr><th>Uploader</th><th>Filename</th><th>Download</th></tr>`;

  metadata.forEach(file => {
    const url = `https://drive.google.com/uc?id=${file.fileId}&export=download`;
    html += `<tr>
      <td>${file.username}</td>
      <td>${file.filename}</td>
      <td><a href="${url}" target="_blank">Download</a></td>
    </tr>`;
  });

  html += `</table>`;
  res.send(html);
});

// --- Start Server ---
app.listen(PORT, () => console.log(`DropVault running on port ${PORT}`));
