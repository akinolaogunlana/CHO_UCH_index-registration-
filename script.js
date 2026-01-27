document.addEventListener("DOMContentLoaded", function () {

  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";
  const ADMIN_PASSWORD = "CHO@2026Secure!";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const downloadPDFBtn = document.getElementById("downloadPDFBtn");
  const previewContainer = document.getElementById("previewContainer");
  let passportDataUrl = "";

  // ---------------- Passport Preview ----------------
  document.getElementById("passport").addEventListener("change", function () {
    previewContainer.innerHTML = "";
    const file = this.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG/PNG allowed.");
      this.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert("Max 5MB.");
      this.value = "";
      return;
    }

    const img = document.createElement("img");
    img.style.maxWidth = "150px";
    img.style.borderRadius = "8px";
    img.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      passportDataUrl = canvas.toDataURL("image/jpeg");
    };
    img.src = URL.createObjectURL(file);
    previewContainer.appendChild(img);
  });

  // ---------------- Load existing record ----------------
  async function loadRecord() {
    const surname = form.surname.value.trim().toUpperCase();
    const bloodGroup = form.bloodgroup.value.trim().toUpperCase();
    const olevelType = form.olevel_type.value.trim();

    if (!surname || !bloodGroup || !olevelType) return;

    try {
      const res = await fetch(SHEETBEST_URL);
      const allData = await res.json();

      const record = allData.find(r =>
        r.SURNAME === surname &&
        r.BLOOD_GROUP === bloodGroup &&
        r.OLEVEL_TYPE === olevelType
      );

      if (record) {
        // Prefill form
        form.firstname.value = record.FIRSTNAME || "";
        form.othernames.value = record.OTHERNAMES || "";
        form.cadre.value = record.CADRE || "CHO";
        form.gender.value = record.GENDER || "";
        form.state.value = record.STATE || "";
        form.lga_city_town.value = record.LGA_CITY_TOWN || "";
        form.dob.value = record.DATE_OF_BIRTH || "";
        form.olevel_year.value = record.OLEVEL_YEAR || "";
        form.olevel_exam.value = record.OLEVEL_EXAM_NUMBER || "";
        form.alevel_type.value = record.ALEVEL_TYPE || "";
        form.alevel_year.value = record.ALEVEL_YEAR || "";
        form.pro_cert.value = record.PROFESSIONAL_CERTIFICATE_NUMBER || "";
        form.remarks.value = record.REMARKS || "";

        document.getElementById("engGrade").value = record.ENGLISH?.split(" ")[0] || "";
        document.getElementById("engBody").value = record.ENGLISH?.match(/\((.*?)\)/)?.[1] || "WAEC";

        document.getElementById("mathGrade").value = record.MATHEMATICS?.split(" ")[0] || "";
        document.getElementById("mathBody").value = record.MATHEMATICS?.match(/\((.*?)\)/)?.[1] || "WAEC";

        document.getElementById("bioGrade").value = record.BIOLOGY?.split(" ")[0] || "";
        document.getElementById("bioBody").value = record.BIOLOGY?.match(/\((.*?)\)/)?.[1] || "WAEC";

        document.getElementById("chemGrade").value = record.CHEMISTRY?.split(" ")[0] || "";
        document.getElementById("chemBody").value = record.CHEMISTRY?.match(/\((.*?)\)/)?.[1] || "WAEC";

        document.getElementById("phyGrade").value = record.PHYSICS?.split(" ")[0] || "";
        document.getElementById("phyBody").value = record.PHYSICS?.match(/\((.*?)\)/)?.[1] || "WAEC";

        if (record.PASSPORT) {
          passportDataUrl = record.PASSPORT;
          previewContainer.innerHTML = `<img src="${record.PASSPORT}" style="max-width:150px;border-radius:8px;box-shadow:0 4px 15px rgba(0,0,0,0.15)">`;
        }
      }
    } catch (err) {
      console.error("Failed to load record:", err);
    }
  }

  // Call loadRecord whenever Surname + Blood Group + O-level changes
  ["surname", "bloodgroup", "olevel_type"].forEach(name => {
    form[name].addEventListener("change", loadRecord);
    form[name].addEventListener("input", loadRecord);
  });

  // ---------------- Form Submission ----------------
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try {
      // Validate date format MM/DD/YYYY
      const dob = form.dob.value.trim();
      if (!/^\d{2}\/\d{2}\/\d{4}$/.test(dob)) throw "Date of birth must be MM/DD/YYYY";

      // Upload passport if changed
      let passportUrl = passportDataUrl;
      const file = document.getElementById("passport").files[0];
      if (file) {
        const cloudForm = new FormData();
        cloudForm.append("file", file);
        cloudForm.append("upload_preset", CLOUDINARY_PRESET);
        const cloudRes = await fetch(CLOUDINARY_URL, { method: "POST", body: cloudForm });
        const cloudData = await cloudRes.json();
        passportUrl = cloudData.secure_url;
      }

      // Fetch all data
      const res = await fetch(SHEETBEST_URL);
      const allData = await res.json();

      // Check for existing record
      const existingRecord = allData.find(r =>
        r.SURNAME === form.surname.value.trim().toUpperCase() &&
        r.BLOOD_GROUP === form.bloodgroup.value.trim().toUpperCase() &&
        r.OLEVEL_TYPE === form.olevel_type.value.trim()
      );

      // Build data object
      const recordData = {
        SURNAME: form.surname.value.trim().toUpperCase(),
        FIRSTNAME: form.firstname.value.trim().toUpperCase(),
        OTHERNAMES: form.othernames.value.trim().toUpperCase(),
        BLOOD_GROUP: form.bloodgroup.value,
        OLEVEL_TYPE: form.olevel_type.value,
        OLEVEL_YEAR: form.olevel_year.value,
        OLEVEL_EXAM_NUMBER: form.olevel_exam.value,
        ALEVEL_TYPE: form.alevel_type.value,
        ALEVEL_YEAR: form.alevel_year.value,
        PROFESSIONAL_CERTIFICATE_NUMBER: form.pro_cert.value,
        CADRE: form.cadre.value,
        GENDER: form.gender.value,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga_city_town.value,
        DATE_OF_BIRTH: dob,
        PASSPORT: passportUrl,
        ENGLISH: `${document.getElementById("engGrade").value} (${document.getElementById("engBody").value})`,
        MATHEMATICS: `${document.getElementById("mathGrade").value} (${document.getElementById("mathBody").value})`,
        BIOLOGY: document.getElementById("bioGrade").value ? `${document.getElementById("bioGrade").value} (${document.getElementById("bioBody").value})` : "",
        CHEMISTRY: document.getElementById("chemGrade").value ? `${document.getElementById("chemGrade").value} (${document.getElementById("chemBody").value})` : "",
        PHYSICS: document.getElementById("phyGrade").value ? `${document.getElementById("phyGrade").value} (${document.getElementById("phyBody").value})` : "",
        REMARKS: form.remarks.value
      };

      // Save: if exists, PATCH; else POST
      let saveRes;
      if (existingRecord && existingRecord._rowNumber) {
        // Update existing
        saveRes = await fetch(`${SHEETBEST_URL}/${existingRecord._rowNumber}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(recordData)
        });
      } else {
        saveRes = await fetch(SHEETBEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([recordData])
        });
      }

      if (!saveRes.ok) throw "Failed to save record";

      form.innerHTML = `<div style="text-align:center;padding:40px">
        <h2 style="color:#2ecc71">✅ Submission Saved</h2>
        <p>Your information has been successfully saved.</p>
        <button onclick="location.reload()">Edit Again / Submit Another</button>
        <button id="downloadSlipBtn">Download Slip (PDF)</button>
      </div>`;

      // PDF download for slip
      document.getElementById("downloadSlipBtn").addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;
        doc.setFontSize(18);
        doc.text("CHO Indexing Slip", 105, y, { align: "center" });
        y += 10;
        if (passportUrl) doc.addImage(passportUrl, "JPEG", 80, y, 50, 50);
        y += 60;
        Object.entries(recordData).forEach(([k, v]) => {
          doc.setFontSize(12);
          doc.text(`${k}: ${v}`, 20, y);
          y += 8;
          if (y > 280) { doc.addPage(); y = 20; }
        });
        doc.save(`CHO_Slip_${recordData.SURNAME}.pdf`);
      });

    } catch (err) {
      alert(err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
      console.error(err);
    }
  });

});