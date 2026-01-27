/* ================================
   CONFIGURATION
================================ */

// 🔁 SheetBest endpoints
const RETRIEVE_URL = "https://sheet.best/api/sheets/YOUR_SHEET_ID";
const UPDATE_URL   = "https://sheet.best/api/sheets/YOUR_SHEET_ID";

// ☁️ Cloudinary unsigned upload
const CLOUDINARY_UPLOAD_URL = "https://api.cloudinary.com/v1_1/YOUR_CLOUD_NAME/image/upload";
const CLOUDINARY_UPLOAD_PRESET = "YOUR_UPLOAD_PRESET";

/* ================================
   DOM ELEMENTS
================================ */

const form = document.getElementById("indexForm");
const retrieveBtn = document.getElementById("retrieveBtn");
const passportInput = document.getElementById("passport");
const previewContainer = document.getElementById("previewContainer");
const downloadPDFBtn = document.getElementById("downloadPDFBtn");

/* ================================
   STATE
================================ */

let currentRowId = null;
let currentPassportUrl = null;

/* ================================
   RETRIEVE RECORD
================================ */

retrieveBtn.addEventListener("click", async () => {
  const firstname = form.firstname.value.trim();
  const bloodgroup = form.bloodgroup.value;
  const olevelType = form.olevel_type.value;

  if (!firstname || !bloodgroup || !olevelType) {
    alert("Please fill all retrieval fields");
    return;
  }

  try {
    const res = await fetch(RETRIEVE_URL);
    const data = await res.json();

    const record = data.find(row =>
      row.firstname?.toLowerCase() === firstname.toLowerCase() &&
      row.bloodgroup === bloodgroup &&
      row.olevel_type === olevelType
    );

    if (!record) {
      alert("Record not found");
      return;
    }

    populateForm(record);
    currentRowId = record.id || record._id || null;
    currentPassportUrl = record.passport || null;

    downloadPDFBtn.classList.remove("hidden");

  } catch (err) {
    console.error(err);
    alert("Error retrieving record");
  }
});

/* ================================
   POPULATE FORM
================================ */

function populateForm(data) {
  for (let key in data) {
    if (form[key]) {
      form[key].value = data[key];
    }
  }

  if (data.passport) {
    previewContainer.innerHTML = `<img src="${data.passport}" alt="Passport">`;
  }
}

/* ================================
   PASSPORT PREVIEW
================================ */

passportInput.addEventListener("change", () => {
  const file = passportInput.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    previewContainer.innerHTML = `<img src="${reader.result}">`;
  };
  reader.readAsDataURL(file);
});

/* ================================
   CLOUDINARY UPLOAD
================================ */

async function uploadPassport(file) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const res = await fetch(CLOUDINARY_UPLOAD_URL, {
    method: "POST",
    body: formData
  });

  const data = await res.json();
  return data.secure_url;
}

/* ================================
   SUBMIT / UPDATE RECORD
================================ */

form.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!currentRowId) {
    alert("Please retrieve your record first");
    return;
  }

  let passportUrl = currentPassportUrl;

  if (passportInput.files.length > 0) {
    passportUrl = await uploadPassport(passportInput.files[0]);
    // 🔴 Old passport deletion should be handled on backend (signed request)
  }

  const payload = {
    surname: form.surname.value,
    firstname: form.firstname.value,
    othernames: form.othernames.value,
    gender: form.gender.value,
    state: form.state.value,
    lga_city_town: form.lga_city_town.value,
    dob: form.dob.value,
    bloodgroup: form.bloodgroup.value,
    olevel_type: form.olevel_type.value,
    olevel_year: form.olevel_year.value,
    olevel_exam: form.olevel_exam.value,
    alevel_type: form.alevel_type.value,
    alevel_year: form.alevel_year.value,
    passport: passportUrl,
    english: `${engGrade.value} (${engBody.value})`,
    maths: `${mathGrade.value} (${mathBody.value})`,
    biology: `${bioGrade.value} (${bioBody.value})`,
    chemistry: `${chemGrade.value} (${chemBody.value})`,
    physics: `${phyGrade.value} (${phyBody.value})`,
    remarks: form.remarks.value
  };

  try {
    await fetch(`${UPDATE_URL}/id/${currentRowId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    alert("Record updated successfully");

  } catch (err) {
    console.error(err);
    alert("Update failed");
  }
});

/* ================================
   PDF GENERATION
================================ */

downloadPDFBtn.addEventListener("click", () => {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  let y = 10;
  doc.setFontSize(11);

  Array.from(form.elements).forEach(el => {
    if (el.name && el.value && el.type !== "file") {
      doc.text(`${el.name.toUpperCase()}: ${el.value}`, 10, y);
      y += 7;
    }
  });

  doc.save(`${form.firstname.value}_CHO_SLIP.pdf`);
});

/* ================================
   ADMIN (HOOKS ONLY)
================================ */

document.getElementById("adminLoginBtn").onclick = () => {
  alert("Admin login handled separately");
};

document.getElementById("downloadZipBtn").onclick = () => {
  alert("ZIP download handled separately");
};