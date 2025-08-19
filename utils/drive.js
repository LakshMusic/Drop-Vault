// utils/drive.js
const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

if (!process.env.GOOGLE_SERVICE_ACCOUNT) {
  console.error("❌ GOOGLE_SERVICE_ACCOUNT environment variable is not set!");
  process.exit(1);
}

// Parse the JSON from the environment variable
let serviceAccount;
try {
  serviceAccount = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
} catch (err) {
  console.error("❌ Invalid JSON in GOOGLE_SERVICE_ACCOUNT:", err);
  process.exit(1);
}

// Authenticate with Google Drive
const auth = new google.auth.GoogleAuth({
  credentials: serviceAccount,
  scopes: ["https://www.googleapis.com/auth/drive"],
});

const drive = google.drive({ version: "v3", auth });

// Upload file to Drive
async function uploadFile(file) {
  const folderId = "YOUR_DRIVE_FOLDER_ID"; // replace with your "DropVault Uploads" folder ID
  const fileMetadata = {
    name: file.originalname,
    parents: [folderId],
  };
  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(file.path),
  };
  const response = await drive.files.create({
    resource: fileMetadata,
    media,
    fields: "id",
  });
  return response.data.id;
}

// Download file from Drive to local path
async function downloadFile(fileId, destPath) {
  const res = await drive.files.get(
    { fileId, alt: "media" },
    { responseType: "stream" }
  );
  await new Promise((resolve, reject) => {
    const dest = fs.createWriteStream(destPath);
    res.data
      .on("end", resolve)
      .on("error", reject)
      .pipe(dest);
  });
}

module.exports = { uploadFile, downloadFile };
