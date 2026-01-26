document.addEventListener("DOMContentLoaded", function () {

  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";
  const ADMIN_PASSWORD = "CHO@2026Secure!";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const downloadPDFBtn = document.getElementById("downloadPDFBtn");
  const adminLoginBtn = document.getElementById("adminLoginBtn");
  const downloadZipBtn = document.getElementById("downloadZipBtn");
  const previewContainer = document.getElementById("previewContainer");

  let passportDataUrl = "";
  let currentRecordId = null; // Store record ID when editing

  // ---------------- Passport Preview ----------------
  function handlePassportPreview(fileInput) {
    previewContainer.innerHTML = "";
    const file = fileInput.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG/PNG images allowed.");
      fileInput.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Image too large (max 5MB).");
      fileInput.value = "";
      return;
    }

    const img = document.createElement("img");
    img.style.maxWidth = "150px";
    img.style.borderRadius = "8px";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      passportDataUrl = canvas.toDataURL("image/jpeg");
    };
    img.src = URL.createObjectURL(file);
    previewContainer.appendChild(img);
  }

  document.getElementById("passport").addEventListener("change", function () {
    handlePassportPreview(this);
  });

  // ---------------- PDF Download ----------------
  function downloadSlipPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(18);
    doc.text("CHO Indexing Form", 105, y, { align: "center" });
    y += 10;

    if (passportDataUrl) {
      doc.addImage(passportDataUrl, "JPEG", 80, y, 50, 50);
      y += 60;
    }

    doc.setFontSize(12);

    const fields = [
      ["SURNAME", form.surname.value.toUpperCase()],
      ["FIRSTNAME", form.firstname.value.toUpperCase()],
      ["OTHERNAMES", form.othernames.value.toUpperCase()],
      ["CADRE", form.cadre.value],
      ["GENDER", form.gender.value],
      ["BLOOD GROUP", form.bloodgroup.value],
      ["STATE", form.state.value],
      ["LGA / CITY/TOWN", form.lga_city_town.value],
      ["DATE OF BIRTH", form.dob.value],
      ["O-LEVEL TYPE", form.olevel_type.value],
      ["O-LEVEL YEAR", form.olevel_year.value],
      ["O-LEVEL EXAM NO.", form.olevel_exam.value],
      ["REMARKS", form.remarks.value]
    ];

    fields.forEach(([label, value]) => {
      doc.text(`${label}: ${value}`, 20, y);
      y += 8;
      if (y > 280) { doc.addPage(); y = 20; }
    });

    doc.save(`CHO_Form_${form.surname.value}_${form.firstname.value}.pdf`);
  }

  downloadPDFBtn.addEventListener("click", downloadSlipPDF);

  // ---------------- Admin Access ----------------
  function requireAdminAccess() {
    const entered = prompt("🔒 Admin Password:");
    if (entered !== ADMIN_PASSWORD) { alert("❌ Access Denied"); return false; }
    return true;
  }

  adminLoginBtn.addEventListener("click", () => {
    if (requireAdminAccess()) {
      downloadZipBtn.style.display = "inline-block";
      adminLoginBtn.style.display = "none";
      alert("✅ Admin access granted");
    }
  });

  // ---------------- Bulk ZIP Download ----------------
  downloadZipBtn.addEventListener("click", async () => {
    if (!requireAdminAccess()) return;
    downloadZipBtn.disabled = true;
    downloadZipBtn.innerText = "Preparing ZIP...";
    try {
      const res = await fetch(SHEETBEST_URL);
      const allData = await res.json();
      const zip = new JSZip();
      const imgFolder = zip.folder("passports");

      for (let i = 0; i < allData.length; i++) {
        const record = allData[i];
        if (record.PASSPORT) {
          const imgRes = await fetch(record.PASSPORT);
          const blob = await imgRes.blob();
          const name = `${record.SURNAME}_${record.FIRSTNAME}_${i + 1}.jpg`;
          imgFolder.file(name, blob);
        }
      }

      const content = await zip.generateAsync({ type: "blob" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(content);
      a.download = "CHO_Passports.zip";
      a.click();
    } catch (err) {
      alert("Failed to create ZIP");
      console.error(err);
    } finally {
      downloadZipBtn.disabled = false;
      downloadZipBtn.innerText = "Download All Passports (ZIP)";
    }
  });

  // ---------------- Live Duplicate Check ----------------
  async function checkDuplicateLive() {
    const surnameInput = form.surname;
    const firstnameInput = form.firstname;

    let warning = document.getElementById("duplicateWarning");
    if (!warning) {
      warning = document.createElement("div");
      warning.id = "duplicateWarning";
      warning.style.color = "red";
      warning.style.marginTop = "5px";
      surnameInput.parentNode.insertBefore(warning, submitBtn);
    }

    async function validate() {
      const s = surnameInput.value.trim().toUpperCase();
      const f = firstnameInput.value.trim().toUpperCase();
      if (!s && !f) {
        warning.textContent = "";
        submitBtn.disabled = false;
        surnameInput.style.borderColor = "";
        firstnameInput.style.borderColor = "";
        return;
      }

      try {
        const res = await fetch(SHEETBEST_URL);
        const allData = await res.json();
        const duplicate = allData.find(r => r.SURNAME === s && r.FIRSTNAME === f);

        if (duplicate) {
          warning.textContent = "❌ Duplicate entry detected!";
          submitBtn.disabled = true;
          surnameInput.style.borderColor = "red";
          firstnameInput.style.borderColor = "red";
        } else {
          warning.textContent = "";
          submitBtn.disabled = false;
          surnameInput.style.borderColor = "";
          firstnameInput.style.borderColor = "";
        }
      } catch (err) {
        console.error("Failed to check duplicates:", err);
      }
    }

    surnameInput.addEventListener("input", validate);
    firstnameInput.addEventListener("input", validate);
  }

  checkDuplicateLive();

  // ---------------- Retrieve & Edit ----------------
  const retrieveBtn = document.createElement("button");
  retrieveBtn.type = "button";
  retrieveBtn.innerText = "Retrieve My Data";
  retrieveBtn.style.margin = "10px 0";
  form.prepend(retrieveBtn);

  retrieveBtn.addEventListener("click", async () => {
    const surname = form.surname.value.trim().toUpperCase();
    const bloodGroup = form.bloodgroup.value;
    const olevelType = form.olevel_type.value;

    if (!surname || !bloodGroup || !olevelType) {
      alert("Please fill SURNAME, BLOOD GROUP, and O-LEVEL TYPE to retrieve data.");
      return;
    }

    try {
      const res = await fetch(SHEETBEST_URL);
      const allData = await res.json();
      const record = allData.find(r =>
        r.SURNAME === surname &&
        r.BLOOD_GROUP === bloodGroup &&
        r.OLEVEL_TYPE === olevelType
      );

      if (!record) {
        alert("❌ No record found with these details.");
        return;
      }

      currentRecordId = record._id || null;

      // Populate form
      form.firstname.value = record.FIRSTNAME || "";
      form.othernames.value = record.OTHERNAMES || "";
      form.cadre.value = record.CADRE || "CHO";
      form.gender.value = record.GENDER || "";
      form.state.value = record.STATE || "";
      form.lga_city_town.value = record.LGA_CITY_TOWN || "";
      form.dob.value = record.DATE_OF_BIRTH || "";
      form.olevel_year.value = record.OLEVEL_YEAR || "";
      form.olevel_exam.value = record.OLEVEL_EXAM_NUMBER || "";
      form.remarks.value = record.REMARKS || "";

      if (record.PASSPORT) {
        const img = document.createElement("img");
        img.style.maxWidth = "150px";
        img.src = record.PASSPORT;
        previewContainer.innerHTML = "";
        previewContainer.appendChild(img);
        passportDataUrl = record.PASSPORT;
      }

      alert("✅ Record retrieved! You can now edit and resubmit or download your slip.");
    } catch (err) {
      alert("Failed to retrieve record.");
      console.error(err);
    }
  });

  // ---------------- Form Submission ----------------
  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    if (!form.bloodgroup.value || !form.olevel_type.value) {
      alert("Please select your Blood Group and O-Level Type.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = currentRecordId ? "Updating..." : "Submitting...";

    try {
      let passportUrl = passportDataUrl;

      // If a new passport is selected, upload
      const fileInput = document.getElementById("passport");
      if (fileInput.files[0]) {
        const cloudForm = new FormData();
        cloudForm.append("file", fileInput.files[0]);
        cloudForm.append("upload_preset", CLOUDINARY_PRESET);

        const cloudRes = await fetch(CLOUDINARY_URL, { method: "POST", body: cloudForm });
        const cloudData = await cloudRes.json();
        if (!cloudData.secure_url) throw "Passport upload failed";
        passportUrl = cloudData.secure_url;
      }

      const payload = {
        SURNAME: form.surname.value.trim().toUpperCase(),
        FIRSTNAME: form.firstname.value.trim().toUpperCase(),
        OTHERNAMES: form.othernames.value.trim().toUpperCase(),
        PASSPORT: passportUrl,
        CADRE: form.cadre.value,
        GENDER: form.gender.value,
        BLOOD_GROUP: form.bloodgroup.value,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga_city_town.value,
        DATE_OF_BIRTH: form.dob.value,
        OLEVEL_TYPE: form.olevel_type.value,
        OLEVEL_YEAR: form.olevel_year.value,
        OLEVEL_EXAM_NUMBER: form.olevel_exam.value,
        REMARKS: form.remarks.value
      };

      let resSheet;
      if (currentRecordId) {
        // Update existing record
        resSheet = await fetch(`${SHEETBEST_URL}/${currentRecordId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // New record
        resSheet = await fetch(SHEETBEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([payload])
        });
      }

      if (!resSheet.ok) throw "Failed to save data";

      form.innerHTML = `
        <div style="text-align:center;padding:40px">
          <h2 style="color:#2ecc71">✅ Submission Successful</h2>
          <button id="downloadSlipBtn">Download My Slip</button>
          <button onclick="location.reload()">Submit Another</button>
        </div>
      `;

      document.getElementById("downloadSlipBtn").addEventListener("click", downloadSlipPDF);

    } catch (err) {
      alert(err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
      console.error(err);
    }
  });

});