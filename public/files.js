async function loadFiles() {
  const fileListDiv = document.getElementById("fileList");
  fileListDiv.innerHTML = "Loading files...";

  try {
    const res = await fetch("/files");
    const files = await res.json();

    if (files.length === 0) {
      fileListDiv.innerHTML = "<p>No files uploaded yet.</p>";
      return;
    }

    fileListDiv.innerHTML = "";
    files.forEach(file => {
      const fileDiv = document.createElement("div");
      fileDiv.className = "file-item";

      fileDiv.innerHTML = `
        <p><strong>${file.filename}</strong> (by ${file.uploader})</p>
        <button onclick="accessFile('${file.id}')">Access</button>
        <span id="msg-${file.id}"></span>
      `;

      fileListDiv.appendChild(fileDiv);
    });
  } catch (err) {
    fileListDiv.innerHTML = "<p>Error loading files!</p>";
  }
}

async function accessFile(fileId) {
  const password = prompt("Enter password to access this file:");
  if (!password) return;

  try {
    const res = await fetch(`/access/${fileId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password })
    });

    const data = await res.json();
    const msgSpan = document.getElementById(`msg-${fileId}`);

    if (res.ok) {
      msgSpan.innerHTML = `<a href="${data.downloadUrl}" target="_blank">⬇ Download</a>`;
      msgSpan.style.color = "lightgreen";
    } else {
      msgSpan.innerText = data.error;
      msgSpan.style.color = "red";
    }
  } catch (err) {
    alert("Something went wrong!");
  }
}

loadFiles();
