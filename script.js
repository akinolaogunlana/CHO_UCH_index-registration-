document.addEventListener("DOMContentLoaded", function () {

  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button");

  // Create preview container for passport
  const previewContainer = document.createElement("div");
  previewContainer.style.textAlign = "center";
  previewContainer.style.margin = "15px 0";
  form.insertBefore(previewContainer, submitBtn);

  let passportDataUrl = ""; // Store passport image for PDF

  // Preview passport when selected
  document.getElementById("passport").addEventListener("change", function () {
    previewContainer.innerHTML = "";
    const file = this.files[0];
    if (file) {
      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type)) {
        alert("Only JPG and PNG images allowed.");
        this.value = "";
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert("Image too large (max 5MB).");
        this.value = "";
        return;
      }

      const img = document.createElement("img");
      img.style.maxWidth = "150px";
      img.style.borderRadius = "8px";
      img.style.boxShadow = "0 4px 15px rgba(0,0,0,0.15)";
      img.src = URL.createObjectURL(file);
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        passportDataUrl = canvas.toDataURL("image/jpeg");
      };
      previewContainer.appendChild(img);
    }
  });

  // Handle form submission
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Uploading passport...";

    try {
      const file = document.getElementById("passport").files[0];

      if (!file) throw "Passport photo is required.";
      if (!["image/jpeg", "image/png", "image/jpg"].includes(file.type))
        throw "Only JPG and PNG images allowed.";
      if (file.size > 5 * 1024 * 1024)
        throw "Image too large (max 5MB).";

      /* ========= 1. Upload Passport to Cloudinary ========= */
      const cloudForm = new FormData();
      cloudForm.append("file", file);
      cloudForm.append("upload_preset", CLOUDINARY_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, { method: "POST", body: cloudForm });
      if (!cloudRes.ok) throw "Cloudinary upload failed.";

      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw "Invalid Cloudinary response.";

      submitBtn.innerText = "Saving data...";

      /* ========= 2. Prepare SheetBest Payload ========= */
      const data = [{
        SURNAME: form.surname.value.trim().toUpperCase(),
        FIRSTNAME: form.firstname.value.trim().toUpperCase(),
        OTHERNAMES: form.othernames.value.trim().toUpperCase(),
        PASSPORT: cloudData.secure_url,
        CADRE: form.cadre.value,
        GENDER: form.gender.value,
        BLOOD_GROUP: form.bloodgroup.value,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga.value,
        DATE_OF_BIRTH: form.dob.value,
        OLEVEL_TYPE: form.olevel_type.value,
        OLEVEL_YEAR: form.olevel_year.value,
        OLEVEL_EXAM_NUMBER: form.olevel_exam.value,
        ALEVEL_TYPE: form.alevel_type.value,
        ALEVEL_YEAR: form.alevel_year.value,
        PROFESSIONAL_CERTIFICATE_NUMBER: form.pro_cert.value,
        ENGLISH: `${document.getElementById("engGrade").value} (${document.getElementById("engBody").value})`,
        MATHEMATICS: `${document.getElementById("mathGrade").value} (${document.getElementById("mathBody").value})`,
        BIOLOGY: document.getElementById("bioGrade").value ? `${document.getElementById("bioGrade").value} (${document.getElementById("bioBody").value})` : "",
        CHEMISTRY: document.getElementById("chemGrade").value ? `${document.getElementById("chemGrade").value} (${document.getElementById("chemBody").value})` : "",
        PHYSICS: document.getElementById("phyGrade").value ? `${document.getElementById("phyGrade").value} (${document.getElementById("phyBody").value})` : "",
        REMARKS: form.remarks.value
      }];

      /* ========= 3. Send to SheetBest ========= */
      const sheetRes = await fetch(SHEETBEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!sheetRes.ok) throw "Sheet save failed. Check sheet headers.";

      /* ========= 4. Success Screen with PDF download ========= */
      form.innerHTML = `
        <div style="text-align:center;padding:40px">
          <h2 style="color:#2ecc71">✅ Submission Successful</h2>
          <p>Your information has been saved successfully.</p>
          <button id="downloadPdfBtn">Download PDF Copy</button>
          <button onclick="location.reload()" style="margin-top:10px;">Submit Another</button>
        </div>
      `;

      // PDF Download after submission
      document.getElementById("downloadPdfBtn").addEventListener("click", async () => {
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
          ["SURNAME", data[0].SURNAME],
          ["FIRSTNAME", data[0].FIRSTNAME],
          ["OTHERNAMES", data[0].OTHERNAMES],
          ["CADRE", data[0].CADRE],
          ["GENDER", data[0].GENDER],
          ["BLOOD GROUP", data[0].BLOOD_GROUP],
          ["STATE", data[0].STATE],
          ["LGA / CITY/TOWN", data[0].LGA_CITY_TOWN],
          ["DATE OF BIRTH", data[0].DATE_OF_BIRTH],
          ["O-LEVEL TYPE", data[0].OLEVEL_TYPE],
          ["O-LEVEL YEAR", data[0].OLEVEL_YEAR],
          ["O-LEVEL EXAM NO.", data[0].OLEVEL_EXAM_NUMBER],
          ["A-LEVEL TYPE", data[0].ALEVEL_TYPE],
          ["A-LEVEL YEAR", data[0].ALEVEL_YEAR],
          ["PROFESSIONAL CERT. NO.", data[0].PROFESSIONAL_CERTIFICATE_NUMBER],
          ["ENGLISH", data[0].ENGLISH],
          ["MATHEMATICS", data[0].MATHEMATICS],
          ["BIOLOGY", data[0].BIOLOGY],
          ["CHEMISTRY", data[0].CHEMISTRY],
          ["PHYSICS", data[0].PHYSICS],
          ["REMARKS", data[0].REMARKS]
        ];

        fields.forEach(([label, value]) => {
          doc.text(`${label}: ${value}`, 20, y);
          y += 8;
          if (y > 280) {
            doc.addPage();
            y = 20;
          }
        });

        doc.save(`CHO_Form_${data[0].SURNAME}_${data[0].FIRSTNAME}.pdf`);
      });

    } catch (error) {
      console.error(error);
      alert(error);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }

  });
});