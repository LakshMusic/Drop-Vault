const { google } = require('googleapis');
const fs = require('fs');

const credentials = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);
const auth = new google.auth.GoogleAuth({
  credentials,
  scopes: ['https://www.googleapis.com/auth/drive'],
});

const drive = google.drive({ version: 'v3', auth });

// Your Google Drive folder ID
const FOLDER_ID = 'YOUR_FOLDER_ID';

async function uploadFile(file) {
  const fileMetadata = { name: file.originalname, parents: [FOLDER_ID] };
  const media = { mimeType: file.mimetype, body: fs.createReadStream(file.path) };
  const response = await drive.files.create({ resource: fileMetadata, media, fields: 'id' });
  return response.data.id;
}

module.exports = { uploadFile };
