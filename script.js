document.addEventListener("DOMContentLoaded", () => {

  /* ================= CONFIG ================= */
  const SHEETBEST_URL =
    "https://api.sheetbest.com/sheets/ceb9eddc-af9a-473a-9a32-f52c21c7f72b";

  const CLOUDINARY_URL =
    "https://api.cloudinary.com/v1_1/dpsbwjw83/image/upload";

  const CLOUDINARY_PRESET = "cho_passports";

  /* ================= ELEMENTS ================= */
  const form = document.getElementById("indexForm");
  const passportInput = document.getElementById("passport");
  const previewContainer = document.getElementById("previewContainer");
  const downloadPDFBtn = document.getElementById("downloadPDFBtn");

  /* ================= STATE ================= */
  let currentRowNumber = null;
  let currentPassportUrl = "";
  let passportDataUrl = "";

  /* ================= PASSPORT PREVIEW ================= */
  passportInput.addEventListener("change", () => {
    previewContainer.innerHTML = "";

    const file = passportInput.files[0];
    if (!file) return;

    if (!["image/jpeg", "image/png"].includes(file.type)) {
      alert("Only JPG or PNG allowed");
      passportInput.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert("Max image size is 5MB");
      passportInput.value = "";
      return;
    }

    const img = document.createElement("img");
    img.style.maxWidth = "150px";
    img.style.borderRadius = "8px";
    img.src = URL.createObjectURL(file);

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d").drawImage(img, 0, 0);
      passportDataUrl = canvas.toDataURL("image/jpeg");
    };

    previewContainer.appendChild(img);
  });

  /* ================= RETRIEVE BUTTON ================= */
  const retrieveBtn = document.createElement("button");
  retrieveBtn.type = "button";
  retrieveBtn.textContent = "Retrieve & Edit My Record";
  retrieveBtn.style.marginBottom = "15px";
  form.prepend(retrieveBtn);

  retrieveBtn.addEventListener("click", async () => {
    const firstname = form.firstname.value.trim().toUpperCase();
    const bloodgroup = form.bloodgroup.value.toUpperCase();
    const olevelType = form.olevel_type.value.toUpperCase();

    if (!firstname || !bloodgroup || !olevelType) {
      alert("Enter FIRST NAME, BLOOD GROUP and O-LEVEL TYPE");
      return;
    }

    try {
      const res = await fetch(SHEETBEST_URL);
      if (!res.ok) throw new Error("Fetch failed");

      const rows = await res.json();

      const record = rows.find(row =>
        row["FIRSTNAME"]?.toUpperCase() === firstname &&
        row["BLOOD GROUP"]?.toUpperCase() === bloodgroup &&
        row["O LEVEL TYPE"]?.toUpperCase() === olevelType
      );

      if (!record) {
        alert("No matching record found");
        return;
      }

      populateForm(record);
      currentRowNumber = record._rowNumber;
      currentPassportUrl = record["PASSPORT"] || "";

      alert("Record retrieved successfully. You can now edit.");
      downloadPDFBtn.style.display = "inline-block";

    } catch (err) {
      console.error(err);
      alert("Error retrieving record. Check internet or sheet setup.");
    }
  });

  /* ================= POPULATE FORM ================= */
  function populateForm(r) {
    form.surname.value = r["SURNAME"] || "";
    form.firstname.value = r["FIRSTNAME"] || "";
    form.othernames.value = r["OTHERNAMES"] || "";
    form.gender.value = r["GENDER"] || "";
    form.cadre.value = r["CADRE"] || "";
    form.state.value = r["STATE"] || "";
    form.lga_city_town.value = r["LGA/CITY/TOWN"] || "";
    form.dob.value = r["DOB"] || ""; // manual DOB input
    form.bloodgroup.value = r["BLOOD GROUP"] || "";
    form.olevel_type.value = r["O LEVEL TYPE"] || "";
    form.olevel_year.value = r["O LEVEL YEAR"] || "";
    form.olevel_exam.value = r["O LEVEL EXAM"] || "";
    form.remarks.value = r["REMARKS"] || "";

    if (r["PASSPORT"]) {
      previewContainer.innerHTML = `<img src="${r["PASSPORT"]}" style="max-width:150px;border-radius:8px">`;
      passportDataUrl = r["PASSPORT"];
    }
  }

  /* ================= FORM SUBMIT ================= */
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
      let passportUrl = currentPassportUrl;

      // Upload new passport if selected
      if (passportInput.files.length) {
        const fd = new FormData();
        fd.append("file", passportInput.files[0]);
        fd.append("upload_preset", CLOUDINARY_PRESET);

        const uploadRes = await fetch(CLOUDINARY_URL, {
          method: "POST",
          body: fd
        });

        const uploadData = await uploadRes.json();
        if (!uploadData.secure_url) throw "Passport upload failed";

        passportUrl = uploadData.secure_url;
      }

      const payload = {
        "SURNAME": form.surname.value.trim().toUpperCase(),
        "FIRSTNAME": form.firstname.value.trim().toUpperCase(),
        "OTHERNAMES": form.othernames.value.trim().toUpperCase(),
        "CADRE": form.cadre.value,
        "GENDER": form.gender.value,
        "STATE": form.state.value,
        "LGA/CITY/TOWN": form.lga_city_town.value,
        "DOB": form.dob.value,
        "BLOOD GROUP": form.bloodgroup.value,
        "O LEVEL TYPE": form.olevel_type.value,
        "O LEVEL YEAR": form.olevel_year.value,
        "O LEVEL EXAM": form.olevel_exam.value,
        "REMARKS": form.remarks.value,
        "PASSPORT": passportUrl
      };

      if (currentRowNumber) {
        // UPDATE
        await fetch(`${SHEETBEST_URL}/_rowNumber/${currentRowNumber}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
      } else {
        // NEW SUBMISSION
        await fetch(SHEETBEST_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify([payload])
        });
      }

      alert("Saved successfully");
      downloadPDF();

    } catch (err) {
      console.error(err);
      alert("Submission failed");
    }
  });

  /* ================= PDF ================= */
  function downloadPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    let y = 20;

    doc.setFontSize(16);
    doc.text("CHO INDEXING SLIP", 105, y, { align: "center" });
    y += 15;

    if (passportDataUrl) {
      doc.addImage(passportDataUrl, "JPEG", 80, y, 50, 50);
      y += 60;
    }

    doc.setFontSize(11);

    [
      ["SURNAME", form.surname.value],
      ["FIRST NAME", form.firstname.value],
      ["OTHER NAMES", form.othernames.value],
      ["GENDER", form.gender.value],
      ["BLOOD GROUP", form.bloodgroup.value],
      ["DOB", form.dob.value],
      ["O LEVEL TYPE", form.olevel_type.value],
      ["O LEVEL YEAR", form.olevel_year.value],
      ["O LEVEL EXAM", form.olevel_exam.value]
    ].forEach(([k, v]) => {
      doc.text(`${k}: ${v}`, 20, y);
      y += 8;
    });

    doc.save(`CHO_SLIP_${form.firstname.value}.pdf`);
  }

  downloadPDFBtn.addEventListener("click", downloadPDF);
});