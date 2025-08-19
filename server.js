const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const { google } = require("googleapis");
const bcrypt = require("bcryptjs");
const { uploadFile, downloadFile } = require("./utils/drive");
const { hashPassword, comparePassword } = require("./utils/security");

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "YourNewPasswordHere";

// Folders
const uploadFolder = path.join(__dirname, "uploads");
const metadataPath = path.join(__dirname, "data", "metadata.json");

if (!fs.existsSync(uploadFolder)) fs.mkdirSync(uploadFolder, { recursive: true });
if (!fs.existsSync(metadataPath)) fs.writeFileSync(metadataPath, JSON.stringify([]));

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Multer upload
const upload = multer({ dest: uploadFolder });

// Load metadata
function loadMetadata() {
  return JSON.parse(fs.readFileSync(metadataPath, "utf8"));
}

// Save metadata
function saveMetadata(data) {
  fs.writeFileSync(metadataPath, JSON.stringify(data, null, 2));
}

// Upload route
app.post("/upload", upload.single("file"), async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!req.file) return res.status(400).send("No file uploaded");

    const timestamp = Date.now();
    const hashedPassword = await hashPassword(password);

    // Upload file to Google Drive
    const driveFileId = await uploadFile(req.file);

    // Save metadata
    const metadata = loadMetadata();
    metadata.push({
      uploader: username || "Anonymous",
      filename: req.file.originalname,
      password: hashedPassword,
      driveFileId,
      timestamp,
    });
    saveMetadata(metadata);

    // Cleanup local file
    fs.unlinkSync(req.file.path);

    res.send("File uploaded successfully ✅");
  } catch (err) {
    console.error(err);
    res.status(500).send("Error uploading file");
  }
});

// Public files listing
app.get("/files", (req, res) => {
  const metadata = loadMetadata();
  let html = `
  <html>
  <head>
    <title>DropVault - Files</title>
    <style>
      body { background:#121212; color:#eee; font-family:sans-serif; padding:20px; }
      table { width:100%; border-collapse:collapse; margin-top:20px; }
      th, td { padding:10px; border-bottom:1px solid #333; }
      button { background:#1e90ff; color:#fff; border:none; padding:5px 10px; cursor:pointer; }
      button:hover { background:#006ad1; }
    </style>
  </head>
  <body>
    <h1>Public Files</h1>
    <table>
    <tr><th>Uploader</th><th>Filename</th><th>Date & Time (IST)</th><th>Access</th></tr>
  `;

  metadata.forEach((file, index) => {
    const dateIST = new Date(file.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    html += `
      <tr>
        <td>${file.uploader}</td>
        <td>${file.filename}</td>
        <td>${dateIST}</td>
        <td>
          <form method="POST" action="/access/${index}">
            <input type="password" name="password" placeholder="Enter password" required />
            <button type="submit">Access</button>
          </form>
        </td>
      </tr>
    `;
  });

  html += `</table></body></html>`;
  res.send(html);
});

// Public access with password
app.post("/access/:id", async (req, res) => {
  const metadata = loadMetadata();
  const file = metadata[req.params.id];
  if (!file) return res.status(404).send("File not found");

  const { password } = req.body;
  const isMatch = await comparePassword(password, file.password);

  if (!isMatch) return res.status(403).send("Incorrect password ❌");

  // Download from Google Drive
  try {
    const dest = path.join(uploadFolder, file.filename);
    await downloadFile(file.driveFileId, dest);
    res.download(dest, file.filename, () => {
      fs.unlinkSync(dest); // cleanup temp file
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching file from Drive");
  }
});

// Admin dashboard
app.get("/admin", (req, res) => {
  const password = req.query.password;
  if (password !== ADMIN_PASSWORD) return res.status(403).send("Forbidden: Invalid admin password");

  const metadata = loadMetadata();
  let html = `
  <style>
    body { background:#121212; color:#eee; font-family:sans-serif; padding:20px; }
    table { width:100%; border-collapse:collapse; }
    th, td { padding:10px; border-bottom:1px solid #333; text-align:left; }
    a { color:#1e90ff; text-decoration:none; }
    a:hover { text-decoration:underline; }
  </style>
  <h1>Admin Dashboard</h1>
  <table>
    <tr><th>Uploader</th><th>Filename</th><th>Date & Time (IST)</th><th>Download</th></tr>
  `;

  metadata.forEach((file, index) => {
    const dateIST = new Date(file.timestamp).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
    html += `
      <tr>
        <td>${file.uploader}</td>
        <td>${file.filename}</td>
        <td>${dateIST}</td>
        <td><a href="/admin/download/${index}?password=${ADMIN_PASSWORD}" target="_blank">Download</a></td>
      </tr>
    `;
  });

  html += `</table>`;
  res.send(html);
});

// Admin download
app.get("/admin/download/:id", async (req, res) => {
  const password = req.query.password;
  if (password !== ADMIN_PASSWORD) return res.status(403).send("Forbidden");

  const metadata = loadMetadata();
  const file = metadata[req.params.id];
  if (!file) return res.status(404).send("File not found");

  try {
    const dest = path.join(uploadFolder, file.filename);
    await downloadFile(file.driveFileId, dest);
    res.download(dest, file.filename, () => {
      fs.unlinkSync(dest);
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Error fetching file from Drive");
  }
});

app.listen(PORT, () => console.log(`DropVault running on port ${PORT}`));
