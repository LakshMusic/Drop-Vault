const { google } = require('googleapis');
const fs = require('fs');

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const folderId = process.env.DRIVE_FOLDER_ID; // Your folder ID

const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive']
});

const drive = google.drive({ version: 'v3', auth });

async function uploadFile(file) {
  const fileMetadata = { name: file.originalname, parents: [folderId] };
  const media = { mimeType: file.mimetype, body: fs.createReadStream(file.path) };

  const res = await drive.files.create({
    resource: fileMetadata,
    media: media,
    fields: 'id, name'
  });

  fs.unlinkSync(file.path);
  return res.data.id;
}

async function listFiles() {
  const res = await drive.files.list({
    q: `'${folderId}' in parents and trashed=false`,
    fields: 'files(id, name)',
    orderBy: 'createdTime desc'
  });
  return res.data.files;
}

module.exports = { uploadFile, listFiles };
