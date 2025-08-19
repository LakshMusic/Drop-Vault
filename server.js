const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const { uploadFile, getFileLink } = require('./utils/drive');
const { hashPassword, checkPassword } = require('./utils/security');

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const upload = multer({ dest: "uploads/" });
const metadataPath = path.join(__dirname, "data", "metadata.json");

// ensure metadata file exists
if (!fs.existsSync(metadataPath)) fs.writeFileSync(metadataPath, "[]");

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Upload Route
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const { username, filepass } = req.body;
    const file = req.file;

    if (!file) return res.status(400).send("No file uploaded");

    // Upload to Google Drive
    const driveFileId = await uploadFile(file);

    // Save metadata
    const metadata = JSON.parse(fs.readFileSync(metadataPath));
    metadata.push({
      uploader: username || "Anonymous",
      filename: file.originalname,
      password: hashPassword(filepass),
      driveFileId,
      timestamp: Date.now()
    });
    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    // Cleanup local
    fs.unlinkSync(file.path);

    res.send("File uploaded successfully!");
  } catch (err) {
    console.error(err);
    res.status(500).send("Upload failed");
  }
});

// Admin dashboard
app.get('/admin', (req, res) => {
  if (req.query.password !== ADMIN_PASSWORD) return res.status(403).send("Forbidden");

  const metadata = JSON.parse(fs.readFileSync(metadataPath));
  let html = `<h1>Admin Files</h1><table border="1"><tr><th>Uploader</th><th>Filename</th><th>Date</th><th>Download</th></tr>`;
  metadata.forEach(file => {
    const date = new Date(file.timestamp).toLocaleString();
    const link = getFileLink(file.driveFileId);
    html += `<tr><td>${file.uploader}</td><td>${file.filename}</td><td>${date}</td><td><a href="${link}" target="_blank">Download</a></td></tr>`;
  });
  html += "</table>";
  res.send(html);
});

// Public files
app.get('/files', (req, res) => {
  const metadata = JSON.parse(fs.readFileSync(metadataPath));
  let html = `<h1>Available Files</h1><table border="1"><tr><th>Uploader</th><th>Filename</th><th>Date</th><th>Access</th></tr>`;
  metadata.forEach((file, i) => {
    const date = new Date(file.timestamp).toLocaleString();
    html += `<tr>
      <td>${file.uploader}</td>
      <td>${file.filename}</td>
      <td>${date}</td>
      <td>
        <form method="POST" action="/access/${i}">
          <input type="password" name="filepass" placeholder="Password" required/>
          <button type="submit">Access</button>
        </form>
      </td>
    </tr>`;
  });
  html += "</table>";
  res.send(html);
});

// Access file with password
app.post('/access/:id', express.urlencoded({ extended: true }), (req, res) => {
  const id = req.params.id;
  const { filepass } = req.body;

  const metadata = JSON.parse(fs.readFileSync(metadataPath));
  const file = metadata[id];
  if (!file) return res.status(404).send("File not found");

  if (!checkPassword(filepass, file.password)) {
    return res.status(403).send("Wrong password");
  }

  const link = getFileLink(file.driveFileId);
  res.redirect(link);
});

app.listen(PORT, () => console.log(`DropVault running on port ${PORT}`));
