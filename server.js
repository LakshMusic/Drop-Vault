const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Laksh@123';

const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const upload = multer({ dest: uploadFolder });

// Serve static files (frontend)
app.use(express.static(path.join(__dirname, 'public')));

// Upload route
app.post('/upload', upload.single('file'), (req, res) => {
  const username = req.body.username || "Anonymous";
  res.send(`File uploaded successfully by ${username}`);
});

// Admin dashboard
app.get('/admin', (req, res) => {
  const password = req.query.password;
  if (password !== ADMIN_PASSWORD) return res.status(403).send("Forbidden: Invalid password");

  fs.readdir(uploadFolder, (err, files) => {
    if (err) return res.status(500).send("Error reading files");

    let html = `<style>
      body { background-color: #121212; color: #eee; font-family: sans-serif; padding: 20px; }
      a { color: #1e90ff; text-decoration: none; }
      a:hover { text-decoration: underline; }
      ul { list-style-type: none; padding: 0; }
      li { margin: 5px 0; }
      </style><h1>Uploaded Files</h1><ul>`;
    files.forEach(file => {
      html += `<li><a href="/admin/download/${file}?password=${ADMIN_PASSWORD}" target="_blank">${file}</a></li>`;
    });
    html += `</ul>`;
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
