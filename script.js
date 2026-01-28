document.addEventListener("DOMContentLoaded", () => {

  const $ = id => document.getElementById(id);

  const SHEETBEST_URL =
    "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";

  const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";

  const CLOUDINARY_PRESET = "cho_passports";

  const form = $("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const previewContainer = $("previewContainer");

  /* ================= SUBJECT ELEMENTS ================= */

  const subjects = {
    ENGLISH:     { grade: $("engGrade"),  body: $("engBody") },
    MATHEMATICS: { grade: $("mathGrade"), body: $("mathBody") },
    BIOLOGY:     { grade: $("bioGrade"),  body: $("bioBody") },
    CHEMISTRY:   { grade: $("chemGrade"), body: $("chemBody") },
    PHYSICS:     { grade: $("phyGrade"),  body: $("phyBody") }
  };

  let passportUrl = "";
  let recordID = null;   // ✅ YOUR SHEET ID COLUMN VALUE

  /* ================= SEARCH RECORD ================= */

  $("searchBtn").addEventListener("click", async () => {

    const surname = $("searchSurname").value.trim().toUpperCase();
    const blood   = $("searchBloodGroup").value;
    const olevel  = $("searchOlevelType").value;

    if (!surname || !blood || !olevel) {
      alert("Surname + Blood Group + O-Level Type required");
      return;
    }

    const res = await fetch(SHEETBEST_URL);
    const data = await res.json();

    const record = data.find(r =>
      r.SURNAME?.toUpperCase() === surname &&
      r.BLOOD_GROUP === blood &&
      r.OLEVEL_TYPE === olevel
    );

    if (!record) {
      alert("No record found");
      return;
    }

    /* ✅ STORE YOUR ID COLUMN */
    recordID = record.ID;

    /* ================= AUTO FILL ================= */

    for (let el of form.elements) {
      if (!el.name) continue;
      const key = el.name.toUpperCase();
      if (record[key] !== undefined) {
        el.value = record[key];
      }
    }

    /* ================= SUBJECT SPLIT ================= */

    Object.keys(subjects).forEach(sub => {
      const value = record[sub] || "";
      const match = value.match(/^(.+?)\s*\((.+?)\)$/);

      subjects[sub].grade.value = match ? match[1] : value;
      subjects[sub].body.value  = match ? match[2] : "";
    });

    /* ================= PASSPORT ================= */

    if (record.PASSPORT) {
      passportUrl = record.PASSPORT;
      previewContainer.innerHTML =
        `<img src="${record.PASSPORT}" style="max-width:150px;border-radius:8px">`;
    }

    alert("✅ Record loaded. You can now edit.");
  });

  /* ================= SUBMIT / UPDATE ================= */

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!recordID) {
      alert("Please search and load record first.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Updating...";

    try {

      /* ========= PASSPORT UPLOAD ========= */

      const file = $("passport").files[0];
      if (file) {
        const fd = new FormData();
        fd.append("file", file);
        fd.append("upload_preset", CLOUDINARY_PRESET);

        const upload = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: fd
        });

        const img = await upload.json();
        passportUrl = img.secure_url;
      }

      /* ========= BUILD UPDATE OBJECT ========= */

      const record = {
        ID: recordID, // 🔑 REQUIRED
        SURNAME: form.surname.value.toUpperCase(),
        FIRSTNAME: form.firstname.value.toUpperCase(),
        OTHERNAMES: form.othernames.value?.toUpperCase() || "",
        CADRE: "CHO",
        GENDER: form.gender.value,
        BLOOD_GROUP: form.blood_group.value,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga_city_town.value,
        DATE_OF_BIRTH: form.date_of_birth.value,
        OLEVEL_TYPE: form.olevel_type.value,
        OLEVEL_YEAR: form.olevel_year.value,
        OLEVEL_EXAM_NUMBER: form.olevel_exam_number.value,
        ALEVEL_TYPE: form.alevel_type.value,
        ALEVEL_YEAR: form.alevel_year.value,
        PROFESSIONAL_CERTIFICATE_NUMBER:
          form.professional_certificate_number.value,
        PASSPORT: passportUrl,
        REMARKS: form.remarks.value
      };

      /* ========= SUBJECT SAVE ========= */

      Object.keys(subjects).forEach(sub => {
        const g = subjects[sub].grade.value.trim();
        const b = subjects[sub].body.value.trim();
        record[sub] = g ? `${g} (${b})` : "";
      });

      /* ✅ PATCH = SAFE UPDATE */
      await fetch(`${SHEETBEST_URL}/ID/${recordID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      alert("✅ Record updated successfully");
      location.reload();

    } catch (err) {
      console.error(err);
      alert("Update failed");
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT / UPDATE";
    }
  });

  /* ================= DOWNLOAD SLIP ================= */

  $("downloadPDFBtn").addEventListener("click", async () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 10;

    // Load passport image if available
    async function getPassportData() {
      const fileInput = $("passport").files[0];
      if (fileInput) {
        return new Promise(resolve => {
          const reader = new FileReader();
          reader.onload = e => resolve(e.target.result);
          reader.readAsDataURL(fileInput);
        });
      } else if (passportUrl) {
        return new Promise(resolve => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            const canvas = document.createElement("canvas");
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL("image/jpeg"));
          };
          img.src = passportUrl;
        });
      } else {
        return null;
      }
    }

    const passportData = await getPassportData();
    if (passportData) {
      doc.addImage(passportData, "JPEG", 150, 10, 40, 50);
    }

    // Title
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("CHO INDEXING SLIP", 105, y, { align: "center" });
    y += 20;

    doc.setFontSize(12);
    doc.setFont("helvetica", "normal");

    // Personal Info
    const personalFields = [
      ["SURNAME", form.surname.value],
      ["FIRST NAME", form.firstname.value],
      ["OTHER NAMES", form.othernames.value],
      ["GENDER", form.gender.value],
      ["BLOOD GROUP", form.blood_group.value],
      ["STATE", form.state.value],
      ["LGA/CITY/TOWN", form.lga_city_town.value],
      ["DATE OF BIRTH", form.date_of_birth.value],
      ["O-LEVEL TYPE", form.olevel_type.value],
      ["O-LEVEL YEAR(S)", form.olevel_year.value],
      ["O-LEVEL EXAM NUMBER", form.olevel_exam_number.value],
      ["A-LEVEL TYPE", form.alevel_type.value],
      ["A-LEVEL YEAR", form.alevel_year.value],
      ["PROFESSIONAL CERTIFICATE NO.", form.professional_certificate_number.value]
    ];

    personalFields.forEach(f => {
      if (f[1]) {
        doc.text(`${f[0]}: ${f[1]}`, 10, y);
        y += 8;
      }
    });

    y += 5;

    // Subjects table
    doc.setFont("helvetica", "bold");
    doc.text("Subjects", 10, y);
    y += 6;

    doc.setFont("helvetica", "bold");
    doc.text("Subject", 10, y);
    doc.text("Grade", 80, y);
    doc.text("Exam Body", 140, y);
    y += 4;
    doc.setLineWidth(0.5);
    doc.line(10, y, 200, y);
    y += 4;

    doc.setFont("helvetica", "normal");

    Object.keys(subjects).forEach(sub => {
      const g = subjects[sub].grade.value || "-";
      const b = subjects[sub].body.value || "-";
      doc.text(sub, 10, y);
      doc.text(g, 80, y);
      doc.text(b, 140, y);
      y += 8;
    });

    y += 5;

    // Remarks
    if (form.remarks.value) {
      doc.setFont("helvetica", "bold");
      doc.text("Remarks:", 10, y);
      y += 6;
      doc.setFont("helvetica", "normal");
      doc.text(form.remarks.value, 10, y);
    }

    // Save PDF
    doc.save("CHO_Slip.pdf");
  });

});