const form = document.getElementById("indexForm");
form.addEventListener("submit", async function (e) {
  e.preventDefault();

  const formData = new FormData(form);

  // 🔹 Combine grades + exam body
  ["english", "maths", "biology", "chemistry", "physics"].forEach((subject) => {
    const gradeInput = document.getElementById(subject.slice(0, 3) + "Grade"); // engGrade, mathGrade, etc.
    const bodySelect = document.getElementById(subject.slice(0, 3) + "Body"); // engBody, mathBody, etc.
    formData.set(subject, gradeInput.value + " (" + bodySelect.value + ")");
  });

  try {
    const res = await fetch(SCRIPT_URL, {
      method: "POST",
      body: formData
    });
    const text = await res.text();
    alert(text);
    if (text === "SUCCESS") form.reset();
  } catch (err) {
    alert("Submission failed. Please try again.");
    console.error(err);
  }
});
