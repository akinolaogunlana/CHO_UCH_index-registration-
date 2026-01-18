document.addEventListener("DOMContentLoaded", function () {

  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/c610f771-67a2-4120-b4fa-c2d102aee546";

  // ✅ CORRECT CLOUDINARY URL (uses CLOUD NAME, not API KEY)
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";

  // ✅ Your UNSIGNED preset
  const CLOUDINARY_PRESET = "cho_passports";

  const form = document.getElementById("indexForm");

  if (!form) {
    alert("Form not found. Check form ID.");
    return;
  }

  form.addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = form.querySelector("button");
    submitBtn.disabled = true;
    submitBtn.innerText = "Submitting...";

    try {
      /* ================= PASSPORT UPLOAD ================= */

      const passportInput = document.getElementById("passport");
      const passportFile = passportInput.files[0];

      if (!passportFile) {
        throw "Passport required";
      }

      const cloudForm = new FormData();
      cloudForm.append("file", passportFile);
      cloudForm.append("upload_preset", CLOUDINARY_PRESET);

      const cloudRes = await fetch(CLOUDINARY_URL, {
        method: "POST",
        body: cloudForm
      });

      if (!cloudRes.ok) {
        throw "Passport upload failed";
      }

      const cloudData = await cloudRes.json();

      if (!cloudData.secure_url) {
        throw "No image URL returned";
      }

      const passportUrl = cloudData.secure_url;

      /* ================= SUBJECT GRADES ================= */

      const gradeMap = {
        ENGLISH: ["engGrade", "engBody"],
        MATHEMATICS: ["mathGrade", "mathBody"],
        BIOLOGY: ["bioGrade", "bioBody"],
        CHEMISTRY: ["chemGrade", "chemBody"],
        PHYSICS: ["phyGrade", "phyBody"]
      };

      const data = {};

      Object.entries(gradeMap).forEach(([subject, ids]) => {
        const grade = document.getElementById(ids[0]).value.trim();
        const body = document.getElementById(ids[1]).value.trim();
        data[subject] = grade ? `${grade} (${body})` : "";
      });

      /* ================= FORM FIELDS ================= */

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

      data["REMARKS"] = form.remarks.value;

      /* ================= SEND TO SHEETBEST ================= */

      const res = await fetch(SHEETBEST_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data)
      });

      if (!res.ok) {
        const errText = await res.text();
        console.error(errText);
        throw "SheetBest submission failed";
      }

      /* ================= SUCCESS ================= */

      window.location.href = "success.html";

    } catch (error) {
      console.error(error);
      alert("Submission failed. Please try again.");
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }
  });

});