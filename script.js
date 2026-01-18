document.addEventListener("DOMContentLoaded", () => {

  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/c610f771-67a2-4120-b4fa-c2d102aee546";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/444391351669479/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    submitBtn.disabled = true;
    submitBtn.innerText = "Uploading passport...";

    try {
      const passportInput = document.getElementById("passport");
      if (!passportInput.files.length) throw "Passport required";

      const originalFile = passportInput.files[0];

      // Reject very large files early
      if (originalFile.size > 5 * 1024 * 1024) {
        throw "Image too large. Please select a photo under 5MB.";
      }

      // Upload to Cloudinary
      const cloudForm = new FormData();
      cloudForm.append("file", originalFile);
      cloudForm.append("upload_preset", CLOUDINARY_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: cloudForm
      });

      if (!cloudRes.ok) throw "Cloudinary upload failed";

      const cloudData = await cloudRes.json();
      if (!cloudData.secure_url) throw "No image URL returned";

      const passportUrl = cloudData.secure_url;

      submitBtn.innerText = "Saving form data...";

      const data = {
        SURNAME: form.surname.value.trim().toUpperCase(),
        FIRSTNAME: form.firstname.value.trim().toUpperCase(),
        OTHERNAMES: form.othernames.value.trim().toUpperCase(),
        PASSPORT: passportUrl,
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
        REMARKS: form.remarks.value,
        ENGLISH: `${engGrade.value} (${engBody.value})`,
        MATHEMATICS: `${mathGrade.value} (${mathBody.value})`,
        BIOLOGY: bioGrade.value ? `${bioGrade.value} (${bioBody.value})` : "",
        CHEMISTRY: chemGrade.value ? `${chemGrade.value} (${chemBody.value})` : "",
        PHYSICS: phyGrade.value ? `${phyGrade.value} (${phyBody.value})` : ""
      };

      const sheetRes = await fetch(SHEETBEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!sheetRes.ok) throw "SheetBest save failed";

      form.innerHTML = `
        <div style="text-align:center;padding:40px">
          <h2 style="color:green">✅ Submission Successful</h2>
          <p>Your data has been saved successfully.</p>
          <button onclick="location.reload()">Submit Another</button>
        </div>
      `;

    } catch (err) {
      alert(err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
      console.error(err);
    }
  });
});