document.getElementById("uploadForm").addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(this);
  const status = document.getElementById("status");

  try {
    const res = await fetch("/upload", {
      method: "POST",
      body: formData
    });

    const text = await res.text();
    status.innerText = text;
    status.style.color = res.ok ? "lightgreen" : "red";
  } catch (err) {
    status.innerText = "Upload failed!";
    status.style.color = "red";
  }
});

