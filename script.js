document.addEventListener("DOMContentLoaded", function () {

  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button");

  const previewContainer = document.createElement("div");
  previewContainer.style.textAlign = "center";
  previewContainer.style.margin = "15px 0";
  form.insertBefore(previewContainer, submitBtn);

  let passportDataUrl = "";

  // Passport preview
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
        canvas.getContext("2d").drawImage(img, 0, 0);
        passportDataUrl = canvas.toDataURL("image/jpeg");
      };
      previewContainer.appendChild(img);
    }
  });

  // Form submit
  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Checking duplicates...";

    try {
      const surname = form.surname.value.trim().toUpperCase();
      const firstname = form.firstname.value.trim().toUpperCase();
      const dob = form.dob.value;

      // Check for duplicates
      const existingRes = await fetch(SHEETBEST_URL);
      if (!existingRes.ok) throw "Failed to fetch existing submissions.";
      const existingData = await existingRes.json();

      const duplicate = existingData.find(
        row => row.SURNAME === surname && row.FIRSTNAME === firstname && row.DATE_OF_BIRTH === dob
      );

      if (duplicate) {
        alert("Duplicate submission detected. This person has already been indexed.");
        submitBtn.disabled = false;
        submitBtn.innerText = "SUBMIT";
        return;
      }

      submitBtn.innerText = "Uploading passport...";

      // Upload to Cloudinary
      const file = document.getElementById("passport").files[0];
      if (!file) throw "Passport photo is required.";
      const cloudForm = new FormData();
      cloudForm.append("file", file);
      cloudForm.append("upload_preset", CLOUDINARY_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, { method: "POST", body: cloudForm });
      if (!cloudRes.ok) throw "Cloudinary upload failed.";
      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw "Invalid Cloudinary response.";

      submitBtn.innerText = "Saving data...";

      // Prepare payload
      const data = [{
        SURNAME: surname,
        FIRSTNAME: firstname,
        OTHERNAMES: form.othernames.value.trim().toUpperCase(),
        PASSPORT: cloudData.secure_url,
        CADRE: form.cadre.value,
        GENDER: form.gender.value,
        BLOOD_GROUP: form.bloodgroup.value,
        STATE: form.state.value,
        LGA_CITY_TOWN: form.lga.value,
        DATE_OF_BIRTH: dob,
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

      // Save to SheetBest
      const sheetRes = await fetch(SHEETBEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });
      if (!sheetRes.ok) throw "Sheet save failed. Check headers.";

      // Success screen
      form.innerHTML = `
        <div style="text-align:center;padding:40px">
          <h2 style="color:#2ecc71">✅ Submission Successful</h2>
          <p>Your information has been saved successfully.</p>
          <button id="downloadPdfBtn">Download Your PDF Copy</button>
          <button id="downloadZipBtn" style="margin-top:10px;">Download All Passports (ZIP)</button>
          <button onclick="location.reload()" style="margin-top:10px;">Submit Another</button>
        </div>
      `;

      // Download PDF for this user
      document.getElementById("downloadPdfBtn").addEventListener("click", () => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        let y = 20;

        doc.setFontSize(18);
        doc.text("CHO Indexing Form", 105, y, { align: "center" });
        y += 10;

        if (passportDataUrl) doc.addImage(passportDataUrl, "JPEG", 80, y, 50, 50);

        y += 60;
        Object.entries(data[0]).forEach(([key, value]) => {
          doc.text(`${key}: ${value}`, 20, y);
          y += 8;
          if (y > 280) { doc.addPage(); y = 20; }
        });

        doc.save(`CHO_Form_${surname}_${firstname}.pdf`);
      });

      // Download all passports as ZIP
      document.getElementById("downloadZipBtn").addEventListener("click", async () => {
        try {
          const allRes = await fetch(SHEETBEST_URL);
          const allData = await allRes.json();

          const zip = new JSZip();

          for (let row of allData) {
            if (!row.PASSPORT) continue;

            const imgRes = await fetch(row.PASSPORT);
            const blob = await imgRes.blob();
            zip.file(`${row.SURNAME}_${row.FIRSTNAME}.jpg`, blob);
          }

          const content = await zip.generateAsync({ type: "blob" });
          saveAs(content, "All_Passports.zip");

        } catch (err) {
          alert("Failed to download ZIP.");
          console.error(err);
        }
      });

    } catch (error) {
      console.error(error);
      alert(error);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }
  });

});