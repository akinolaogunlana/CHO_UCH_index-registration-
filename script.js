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
  let recordID = null;

  /* ================= NORMALIZER ================= */

  const normalize = (value) => {
    return value
      ?.toString()
      .replace(/\s+/g, "")     // remove all spaces
      .replace(/[\/\\]/g, "")  // remove slashes
      .toUpperCase()
      .trim();
  };

  /* ================= SEARCH RECORD ================= */

  $("searchBtn").addEventListener("click", async () => {

    const surname = $("searchSurname").value;
    const blood   = $("searchBloodGroup").value;
    const olevel  = $("searchOlevelType").value;

    if (!surname || !blood || !olevel) {
      alert("Surname, Blood Group and O-Level Type are required");
      return;
    }

    try {
      const res = await fetch(SHEETBEST_URL);
      const data = await res.json();

      const record = data.find(r =>
        normalize(r.SURNAME) === normalize(surname) &&
        normalize(r.BLOOD_GROUP) === normalize(blood) &&
        normalize(r.OLEVEL_TYPE) === normalize(olevel)
      );

      if (!record) {
        alert("❌ Record not found. Please check your details carefully.");
        return;
      }

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
        previewContainer.innerHTML = `
          <img src="${passportUrl}"
               style="width:150px;height:180px;
                      object-fit:cover;
                      border-radius:8px;
                      border:2px solid #444;">
        `;
      }

      alert("✅ Record loaded successfully. You can now edit.");

    } catch (err) {
      console.error(err);
      alert("Network error. Please try again.");
    }
  });

  /* ================= SUBMIT / UPDATE ================= */

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!recordID) {
      alert("Please search and load your record first.");
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

      /* ========= BUILD RECORD ========= */

      const record = {
        ID: recordID,
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
        REMARKS: "RETRAINEE"
      };

      /* ========= SUBJECT SAVE ========= */

      Object.keys(subjects).forEach(sub => {
        const g = subjects[sub].grade.value.trim();
        const b = subjects[sub].body.value.trim();
        record[sub] = g ? `${g} (${b})` : "";
      });

      /* ========= UPDATE ========= */

      await fetch(`${SHEETBEST_URL}/ID/${recordID}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      alert("✅ Record updated successfully");
      location.reload();

    } catch (err) {
      console.error(err);
      alert("❌ Update failed.");
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT / UPDATE";
    }
  });

});