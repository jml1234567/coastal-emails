// SigMaker App Logic with GitHub Profile Sync

const form = document.getElementById("form");
const profileNameInput = document.getElementById("profile_name");
const tokenInput = document.getElementById("github_token");
const signatureOutput = document.getElementById("signature-output");
const templateSource = document.getElementById("signature-template").innerHTML;
const template = Handlebars.compile(templateSource);

let currentProfileData = {};
let autoSaveTimer;

// ========== HELPERS ==========
function getToken() {
  return tokenInput.value.trim() || localStorage.getItem("github_token") || "";
}

function saveToken(token) {
  if (token) localStorage.setItem("github_token", token);
}

function sanitizeSocialLinks(data) {
  const map = {
    facebook_link: "https://facebook.com/",
    instagram_link: "https://instagram.com/",
    linkedin_link: "https://linkedin.com/in/",
    youtube_link: "https://youtube.com/@",
    twitter_link: "https://twitter.com/",
    zillow_link: "https://zillow.com/profile/",
    realtor_link: "https://realtor.com/realestateagents/"
  };
  for (const key in map) {
    if (data[key] && !data[key].startsWith("http")) {
      data[key] = map[key] + data[key].replace(/^@/, "");
    }
  }
  return data;
}

function getFormData() {
  const data = Object.fromEntries(new FormData(form).entries());
  return sanitizeSocialLinks({ ...data });
}

function updatePreview() {
  const data = getFormData();
  const html = template({ signature_html: buildSignatureHTML(data) });
  signatureOutput.innerHTML = html;
}

function buildSignatureHTML(data) {
  // For now just basic injection; full template should handle this.
  return `
    <div style="font-family:Arial;">
      <strong>${data.advisor_name || "Your Name"}</strong><br>
      ${data.title || "Your Title"}<br>
      ${data.email || "you@example.com"}
    </div>
  `;
}

function copyHTML() {
  const html = signatureOutput.innerHTML;
  navigator.clipboard.writeText(html).then(() => alert("Copied to clipboard!"));
}

function downloadSignature() {
  const name = profileNameInput.value.trim().toLowerCase().replace(/\s+/g, "-") || "signature";
  const html = signatureOutput.innerHTML;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${name}_signature.html`;
  link.click();
}

function resetForm() {
  form.reset();
  updatePreview();
}

// ========== GITHUB SYNC ==========
const REPO = "coastal-emails";
const USER = "jml1234567";
const PROFILE_PATH = "profiles";

async function saveProfileToGitHub(profileName, data) {
  const token = getToken();
  if (!token || !profileName) return;
  saveToken(token);
  const filePath = `${PROFILE_PATH}/${profileName}.json`;
  const apiUrl = `https://api.github.com/repos/${USER}/${REPO}/contents/${filePath}`;
  const content = btoa(unescape(encodeURIComponent(JSON.stringify(data, null, 2))));

  let sha;
  try {
    const res = await fetch(apiUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const json = await res.json();
      sha = json.sha;
    }
  } catch {}

  const body = {
    message: `Save profile: ${profileName}`,
    content,
    sha
  };

  await fetch(apiUrl, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
}

function autoSaveProfile() {
  clearTimeout(autoSaveTimer);
  autoSaveTimer = setTimeout(() => {
    const data = getFormData();
    const name = profileNameInput.value.trim().toLowerCase().replace(/\s+/g, "-");
    if (name) {
      saveProfileToGitHub(name, data);
    }
  }, 1000);
}

// ========== EVENT LISTENERS ==========
form.addEventListener("input", () => {
  updatePreview();
  autoSaveProfile();
});

tokenInput.addEventListener("change", () => {
  saveToken(tokenInput.value.trim());
});

// ========== INIT ==========
tokenInput.value = localStorage.getItem("github_token") || "";
updatePreview();
