document.addEventListener("DOMContentLoaded", () => {

  const $ = id => document.getElementById(id);

  // ================= CONFIG =================
  const SHEETBEST_URL = "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";
  const CLOUDINARY_URL = "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";
  const CLOUDINARY_PRESET = "cho_passports";

  const form = $("indexForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const previewContainer = $("previewContainer");

  // ================= SUBJECT ELEMENTS =================
  const subjects = {
    ENGLISH:     { grade: $("engGrade"),  body: $("engBody") },
    MATHEMATICS: { grade: $("mathGrade"), body: $("mathBody") },
    BIOLOGY:     { grade: $("bioGrade"),  body: $("bioBody") },
    CHEMISTRY:   { grade: $("chemGrade"), body: $("chemBody") },
    PHYSICS:     { grade: $("phyGrade"),  body: $("phyBody") }
  };

  let passportDataUrl = "";
  let recordId = null; // stores internal SheetBest ID for updating

  // ================= PASSPORT PREVIEW =================
  $("passport").addEventListener("change", function () {
    const file = this.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG or PNG allowed");
      this.value = "";
      return;
    }

    const img = document.createElement("img");
    img.src = URL.createObjectURL(file);
    img.style.maxWidth = "150px";
    img.style.borderRadius = "8px";

    previewContainer.innerHTML = "";
    previewContainer.appendChild(img);

    passportDataUrl = img.src; // temporarily store preview
  });

  // ================= SEARCH =================
  $("searchBtn").addEventListener("click", async () => {
    const surname = $("searchSurname").value.trim().toUpperCase();
    const blood   = $("searchBloodGroup").value.trim();
    const olevel  = $("searchOlevelType").value.trim();

    if (!surname || !blood || !olevel) {
      alert("Surname, blood group and O-Level type required.");
      return;
    }

    try {
      const res = await fetch(SHEETBEST_URL);
      const data = await res.json();

      // Search by SURNAME + BLOOD_GROUP + OLEVEL_TYPE
      const record = data.find(r =>
        r.SURNAME?.toUpperCase() === surname &&
        r.BLOOD_GROUP?.toUpperCase() === blood.toUpperCase() &&
        r.OLEVEL_TYPE?.toUpperCase() === olevel.toUpperCase()
      );

      if (!record) {
        alert("No record found.");
        recordId = null;
        return;
      }

      // store internal SheetBest ID for PATCH
      recordId = record.id;

      // ===== NORMAL FIELDS =====
      for (let el of form.elements) {
        if (!el.name) continue;
        const key = el.name.toUpperCase();
        if (record[key] !== undefined) el.value = record[key];
        else el.value = ""; // empty if field missing
      }

      // ===== SUBJECTS =====
      Object.keys(subjects).forEach(sub => {
        const value = record[sub];
        const g = subjects[sub].grade;
        const b = subjects[sub].body;

        if (!g || !b) return;

        if (!value) {
          g.value = "";
          b.value = "";
          return;
        }

        const match = value.match(/^(.+?)\s*\((.+?)\)$/);
        if (match) {
          g.value = match[1].trim();
          b.value = match[2].trim();
        } else {
          g.value = value;
          b.value = "";
        }
      });

      // ===== PASSPORT =====
      if (record.PASSPORT) {
        passportDataUrl = record.PASSPORT;
        previewContainer.innerHTML =
          `<img src="${record.PASSPORT}" style="max-width:150px;border-radius:8px">`;
      }

      alert("✅ Record loaded successfully");

    } catch (err) {
      console.error(err);
      alert("ERROR loading records: " + err);
    }
  });

  // ================= SUBMIT =================
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!recordId) {
      alert("Please search and load a record first. Cannot update a non-existing record.");
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Saving...";

    try {
      let passportUrl = passportDataUrl;

      // Upload new passport if selected
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
        if (img?.secure_url) passportUrl = img.secure_url;
      }

      // ===== BUILD RECORD =====
      const record = {
        SURNAME: form.surname?.value?.toUpperCase() || "",
        FIRSTNAME: form.firstname?.value?.toUpperCase() || "",
        OTHERNAMES: form.othernames?.value || "",
        CADRE: "CHO",
        GENDER: form.gender?.value || "",
        BLOOD_GROUP: form.blood_group?.value || "",
        STATE: form.state?.value || "",
        LGA_CITY_TOWN: form.lga_city_town?.value || "",
        DATE_OF_BIRTH: form.date_of_birth?.value || "",
        OLEVEL_TYPE: form.olevel_type?.value || "",
        OLEVEL_YEAR: form.olevel_year?.value || "",
        OLEVEL_EXAM_NUMBER: form.olevel_exam_number?.value || "",
        ALEVEL_TYPE: form.alevel_type?.value || "",
        ALEVEL_YEAR: form.alevel_year?.value || "",
        PROFESSIONAL_CERTIFICATE_NUMBER: form.professional_certificate_number?.value || "",
        PASSPORT: passportUrl,
        REMARKS: form.remarks?.value || ""
      };

      // ===== SUBJECTS =====
      Object.keys(subjects).forEach(sub => {
        const g = subjects[sub].grade?.value?.replace(/\(.+?\)/g, "").trim() || "";
        const b = subjects[sub].body?.value || "";
        record[sub] = g ? `${g} (${b})` : "";
      });

      // PATCH the record using internal SheetBest ID
      await fetch(`${SHEETBEST_URL}/${recordId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(record)
      });

      alert("✅ Record updated successfully");
      location.reload();

    } catch (err) {
      console.error(err);
      alert("ERROR updating record: " + err);
      submitBtn.disabled = false;
      submitBtn.innerText = "SUBMIT";
    }
  });

});