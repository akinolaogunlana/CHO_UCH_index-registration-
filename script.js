const SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbzieIuL9kZqDLTmrQlW_FoRNEgJmeGjK2HMac_PIHhtUeogci_TwQgtTyZ3YoUUHg/exec";

document.getElementById("indexForm").addEventListener("submit", function (e) {

  e.preventDefault();

  const form = document.getElementById("indexForm");
  const formData = new FormData(form);

  // 🔹 Combine grades + exam body
  formData.set(
    "english",
    document.getElementById("engGrade").value +
      " (" +
      document.getElementById("engBody").value +
      ")"
  );

  formData.set(
    "maths",
    document.getElementById("mathGrade").value +
      " (" +
      document.getElementById("mathBody").value +
      ")"
  );

  formData.set(
    "biology",
    document.getElementById("bioGrade").value +
      " (" +
      document.getElementById("bioBody").value +
      ")"
  );

  formData.set(
    "chemistry",
    document.getElementById("chemGrade").value +
      " (" +
      document.getElementById("chemBody").value +
      ")"
  );

  formData.set(
    "physics",
    document.getElementById("phyGrade").value +
      " (" +
      document.getElementById("phyBody").value +
      ")"
  );

  fetch(SCRIPT_URL, {
    method: "POST",
    body: formData
  })
    .then(response => response.text())
    .then(text => {
      alert(text);
      if (text === "SUCCESS") {
        form.reset();
      }
    })
    .catch(err => {
      alert("Submission failed. Please try again.");
      console.error(err);
    });
});