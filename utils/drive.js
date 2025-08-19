const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  credentials: JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT),
  scopes: ["https://www.googleapis.com/auth/drive.file"]
});

const drive = google.drive({ version: "v3", auth });

async function uploadFile(file) {
  const res = await drive.files.create({
    requestBody: {
      name: file.originalname,
      parents: ["1nbxBWHN5Xbzh-SUPVpJ1kdI9s9QKAFxq"] // <-- your folder ID
    },
    media: {
      mimeType: file.mimetype,
      body: require("fs").createReadStream(file.path)
    },
    fields: "id"
  });

  // make public
  await drive.permissions.create({
    fileId: res.data.id,
    requestBody: { role: "reader", type: "anyone" }
  });

  return res.data.id;
}

function getFileLink(fileId) {
  return `https://drive.google.com/uc?id=${fileId}&export=download`;
}

module.exports = { uploadFile, getFileLink };
