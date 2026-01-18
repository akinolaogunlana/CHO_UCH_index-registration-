document.addEventListener("DOMContentLoaded", function () {
  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/c610f771-67a2-4120-b4fa-c2d102aee546";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/444391351669479/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";

  const form = document.getElementById("indexForm");
  const submitBtn = form.querySelector("button");
  const passportInput = document.getElementById("passport");
  const passportPreview = document.getElementById("passportPreview");

  // Passport preview (already partially in HTML)
  passportInput.addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Invalid file type. Only JPEG or PNG allowed.");
      this.value = "";
      passportPreview.style.display = "none";
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      alert("File too large. Maximum 2 MB allowed.");
      this.value = "";
      passportPreview.style.display = "none";
      return;
    }

    const reader = new FileReader();
    reader.onload = e => {
      passportPreview.src = e.target.result;
      passportPreview.style.display = "block";
    };
    reader.readAsDataURL(file);
  });

  form.addEventListener("submit", async function (e) {
    e.preventDefault();
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    try {
      // --- 1️⃣ Upload passport to Cloudinary ---
      const passportFile = passportInput.files[0];
      if (!passportFile) throw "Please upload a passport image.";

      const cloudForm = new FormData();
      cloudForm.append("file", passportFile);
      cloudForm.append("upload_preset", CLOUDINARY_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, { method: "POST", body: cloudForm });
      if (!cloudRes.ok) throw "Cloudinary upload failed.";

      const cloudData = await cloudRes.json();
      const passportUrl = cloudData.secure_url;

      // --- 2️⃣ Collect grades ---
      const subjects = {
        ENGLISH: ["engGrade", "engBody"],
        MATHEMATICS: ["mathGrade", "mathBody"],
        BIOLOGY: ["bioGrade", "bioBody"],
        CHEMISTRY: ["chemGrade", "chemBody"],
        PHYSICS: ["phyGrade", "phyBody"]
      };

      const data = {};
      Object.keys(subjects).forEach(subj => {
        const [gradeId, bodyId] = subjects[subj];
        const grade = document.getElementById(gradeId).value.trim();
        const board = document.getElementById(bodyId).value;
        data[subj] = grade ? `${grade} (${board})` : "";
      });

      // --- 3️⃣ Collect personal & other info ---
      data["SURNAME"] = form.surname.value.trim().toUpperCase();
      data["FIRSTNAME"] = form.firstname.value.trim().toUpperCase();
      data["OTHERNAMES"] = form.othernames.value.trim().toUpperCase();
      data["PASSPORT"] = passportUrl;
      data["CADRE"] = form.cadre.value;
      data["GENDER"] = form.gender.value;
      data["BLOOD_GROUP"] = form.bloodgroup.value;
      data["STATE"] = form.state.value;
      data["LGA_CITY_TOWN"] = form.lga.value;
      data["DATE_OF_BIRTH"] = form.dob.value;
      data["OLEVEL_TYPE"] = form.olevel_type.value;
      data["OLEVEL_YEAR"] = form.olevel_year.value;
      data["OLEVEL_EXAM_NUMBER"] = form.olevel_exam.value;
      data["ALEVEL_TYPE"] = form.alevel_type.value;
      data["ALEVEL_YEAR"] = form.alevel_year.value;
      data["PROFESSIONAL_CERTIFICATE_NUMBER"] = form.pro_cert.value;
      data["REMARKS"] = form.remarks.value.trim();

      // --- 4️⃣ Submit to SheetBest ---
      const res = await fetch(SHEETBEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) throw "SheetBest submission failed.";

      // --- 5️⃣ Success ---
      alert("Submission successful! Thank you.");
      form.reset();
      passportPreview.style.display = "none";

    } catch (err) {
      console.error(err);
      alert(err);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }
  });
});