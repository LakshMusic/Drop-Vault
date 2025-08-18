const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'YourNewPasswordHere'; // change here or via env

const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const upload = multer({ dest: uploadFolder });

// Serve frontend
app.use(express.static(path.join(__dirname, 'public')));

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  const username = req.body.username || "Anonymous";
  const originalName = req.file.originalname;
  const timestamp = Date.now();

  // Filename format: username__timestamp__originalname
  const newName = `${username}__${timestamp}__${originalName}`;
  const newPath = path.join(uploadFolder, newName);

  fs.rename(req.file.path, newPath, (err) => {
    if (err) return res.status(500).send("Error saving file");
    res.send(`File uploaded successfully by ${username}`);
  });
});

// Admin dashboard
app.get('/admin', (req, res) => {
  const password = req.query.password;
  if (password !== ADMIN_PASSWORD) return res.status(403).send("Forbidden: Invalid password");

  fs.readdir(uploadFolder, (err, files) => {
    if (err) return res.status(500).send("Error reading files");

    let html = `<style>
      body { background-color: #121212; color: #eee; font-family: sans-serif; padding: 20px; }
      table { width: 100%; border-collapse: collapse; }
      th, td { padding: 10px; border-bottom: 1px solid #333; text-align: left; }
      a { color: #1e90ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      </style>
      <h1>Uploaded Files</h1>
      <table>
      <tr><th>Uploader</th><th>Filename</th><th>Date & Time</th><th>Download</th></tr>`;

    files.forEach(file => {
      const parts = file.split('__');
      const uploader = parts[0];
      const timestamp = Number(parts[1]);
      const filename = parts.slice(2).join('__');
      const date = new Date(timestamp).toLocaleString();

      html += `<tr>
        <td>${uploader}</td>
        <td>${filename}</td>
        <td>${date}</td>
        <td><a href="/admin/download/${file}?password=${ADMIN_PASSWORD}" target="_blank">Download</a></td>
      </tr>`;
    });

    html += `</table>`;
    res.send(html);
  });
});

// Download route
app.get('/admin/download/:filename', (req, res) => {
  const password = req.query.password;
  if (password !== ADMIN_PASSWORD) return res.status(403).send("Forbidden");

  const filepath = path.join(uploadFolder, req.params.filename);
  res.download(filepath);
});

app.listen(PORT, () => console.log(`DropVault running on port ${PORT}`));
