// server.js
// Anonymous File Drop - Express + Multer
// Run: npm init -y && npm install express multer
// then: node server.js

const express = require('express');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const app = express();
app.use(express.static(path.join(__dirname, 'public')));

// Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, UPLOAD_DIR),
  filename: (req, file, cb) => {
    const tmpName = Date.now() + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, tmpName);
  }
});
const upload = multer({
  storage,
  limits: { fileSize: 200 * 1024 * 1024 } // 200 MB
});

// In-memory metadata store
const store = Object.create(null);

function makeId(len = 12) {
  return crypto.randomBytes(len).toString('hex');
}

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const id = makeId(12);
  const tempPath = req.file.path;
  const finalPath = path.join(UPLOAD_DIR, id);

  fs.renameSync(tempPath, finalPath);

  const TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
  const downloadsAllowed = 5;

  store[id] = {
    path: finalPath,
    originalName: req.file.originalname,
    expiresAt: Date.now() + TTL_MS,
    downloadsLeft: downloadsAllowed
  };

  const host = req.get('host');
  const protocol = req.protocol;
  const url = `${protocol}://${host}/f/${id}`;

  res.json({ id, url, expiresAt: store[id].expiresAt, downloadsLeft: store[id].downloadsLeft });
});

// Download endpoint
app.get('/f/:id', (req, res) => {
  const id = req.params.id;
  const meta = store[id];
  if (!meta) return res.status(404).send('Not found or expired');

  if (Date.now() > meta.expiresAt) {
    try { fs.unlinkSync(meta.path); } catch (e) {}
    delete store[id];
    return res.status(410).send('File expired');
  }

  res.download(meta.path, meta.originalName, (err) => {
    if (err) return;
    meta.downloadsLeft -= 1;
    if (meta.downloadsLeft <= 0) {
      try { fs.unlinkSync(meta.path); } catch (e) {}
      delete store[id];
    }
  });
});

// Cleanup expired files
setInterval(() => {
  const now = Date.now();
  for (const id of Object.keys(store)) {
    if (store[id].expiresAt <= now) {
      try { fs.unlinkSync(store[id].path); } catch (e) {}
      delete store[id];
    }
  }
}, 60 * 60 * 1000);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Anonymous file drop running on port ${PORT}`));
