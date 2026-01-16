const allowedGrades = ["A1","B2","B3","C4","C5","C6","D7","E8","F9"];

function validGrade(g) {
  return allowedGrades.includes(g.toUpperCase());
}

document.getElementById("indexForm").addEventListener("submit", function(e) {
  e.preventDefault();

  const grades = [
    engGrade.value,
    mathGrade.value,
    bioGrade.value,
    chemGrade.value,
    phyGrade.value
  ];

  for (let g of grades) {
    if (!validGrade(g)) {
      alert("Invalid grade. Use only A1–F9.");
      return;
    }
  }

  // Combine grade + exam body
  this.english.value   = engGrade.value.toUpperCase()  + " (" + engBody.value + ")";
  this.maths.value     = mathGrade.value.toUpperCase() + " (" + mathBody.value + ")";
  this.biology.value   = bioGrade.value.toUpperCase()  + " (" + bioBody.value + ")";
  this.chemistry.value = chemGrade.value.toUpperCase()+ " (" + chemBody.value + ")";
  this.physics.value   = phyGrade.value.toUpperCase() + " (" + phyBody.value + ")";

  fetch("YOUR_APPS_SCRIPT_WEB_APP_URL", {
    method: "POST",
    body: new FormData(this)
  })
  .then(() => {
    alert("Submission successful");
    this.reset();
  })
  .catch(() => alert("Submission failed"));
});
