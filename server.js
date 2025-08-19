const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFile, listFiles } = require('./utils/drive');

const app = express();
const PORT = process.env.PORT || 3000;

const uploadFolder = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder);

const upload = multer({ dest: uploadFolder });

app.use(express.static(path.join(__dirname, 'public')));

// Upload route
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).send("No file uploaded");
  try {
    const fileId = await uploadFile(req.file);
    const url = `https://drive.google.com/uc?id=${fileId}&export=download`;
    res.send(`✅ File uploaded successfully!<br>Name: ${req.file.originalname}<br>Download Link: <a href="${url}" target="_blank">${url}</a>`);
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed: " + err.message);
  }
});

// Public files list
app.get('/files', async (req, res) => {
  try {
    const files = await listFiles();
    let html = `<h1>DropVault Files</h1><ul>`;
    files.forEach(f => {
      html += `<li><a href="https://drive.google.com/uc?id=${f.id}&export=download" target="_blank">${f.name}</a></li>`;
    });
    html += `</ul>`;
    res.send(html);
  } catch (err) {
    console.error(err);
    res.status(500).send("Failed to list files: " + err.message);
  }
});

app.listen(PORT, () => console.log(`DropVault running on port ${PORT}`));
