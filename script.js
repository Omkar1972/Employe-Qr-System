
window.onload = function () {
  const form = document.getElementById("attendanceForm");
  const dateField = document.getElementById("date");
  const timeField = document.getElementById("time");
  const statusField = document.getElementById("status");
  const msgDiv = document.getElementById("message");

  // --- Auto Date ---
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  dateField.value = formattedDate;

  // --- Auto Time ---
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  }
  setInterval(() => {
    timeField.value = getCurrentTime();
  }, 1000);

  // --- Load Saved User ---
  const savedUser = JSON.parse(localStorage.getItem("userInfo"));
  if (savedUser) {
    document.getElementById("name").value = savedUser.name;
    document.getElementById("mobile").value = savedUser.mobile;
    document.getElementById("email").value = savedUser.email;
    document.getElementById("name").disabled = true;
    document.getElementById("mobile").disabled = true;
    document.getElementById("email").disabled = true;
  }

  // --- Check if already submitted today ---
  // const lastAttendanceDate = localStorage.getItem("lastAttendanceDate");
  // if (lastAttendanceDate === formattedDate) {
  //   form.style.display = "none";
  //   showMessage("✅ You already submitted your attendance for today.", "blue");
  //   return;
  // }

  // --- Default Status ---
  const storedAttendance = JSON.parse(localStorage.getItem("attendanceData"));
  statusField.value =
    storedAttendance && storedAttendance.date === formattedDate ? "Out" : "In";

  // --- Message Function ---
  function showMessage(text, color) {
    msgDiv.style.display = "block";
    msgDiv.innerText = text;
    msgDiv.style.color = color;
    msgDiv.style.opacity = "1";
  }


// --- NEW: Loader Function ---
function toggleLoading(isLoading) {
  const loader = document.getElementById("loader"); // Assume an element with id="loader" exists
  if (loader) {
    loader.style.display = isLoading ? "block" : "none";
  }
  // Optionally, disable the submit button
  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = isLoading;
    submitButton.innerText = isLoading ? "Submitting..." : "Submit";
  }
}
// ------------------------------

   // --- Submit Handler ---
form.addEventListener("submit", function (e) {
  e.preventDefault();

  const name = document.getElementById("name").value.trim();
  const mobile = document.getElementById("mobile").value.trim();
  const email = document.getElementById("email").value.trim();
  const date = dateField.value;
  const time = timeField.value;
  const status = statusField.value;

  if (!savedUser) {
    localStorage.setItem("userInfo", JSON.stringify({ name, mobile, email }));
  }

  // --- In ---
  if (status === "In") {
    const sendData = {
      name,
      mobile,
      email,
      date,
      inTime: time,
      outTime: "",
    };

    // Save locally
    localStorage.setItem("attendanceData", JSON.stringify(sendData));

   // Show loader
    toggleLoading(true);


    // Send "In" data immediately to Google Sheet
 
    fetch("https://script.google.com/macros/s/AKfycbxEqA0uL7JT2yH3bfFhhttsrwQT9fXqiVHDkXhKxsPM1qXyJptZKeU2bmEOyVsjOd3u/exec", {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
     
      body: JSON.stringify(sendData),
    })
    .then(() => {

      // Hide loader
      toggleLoading(false);

      window.location.href = "success.html";

       showMessage(`✅  submitted successfully `, "green");
       statusField.value = "Out"; // change for next submission
    })
    .catch(error => {

      // Hide loader on error
      toggleLoading(false);

      showMessage(`❌ Network error: ${error.message}`, "red");
      console.error("Error submitting In-Time:", error);
    });

    return;
  }


  ////


  ///

  // --- Out ---
  if (status === "Out") {
    const stored = JSON.parse(localStorage.getItem("attendanceData"));
    if (!stored) {
      showMessage("⚠️ Please mark In first!", "red");
      return;
    }

    const outTime = time;
    const sendData = {
      name: stored.name,
      mobile: stored.mobile,
      email: stored.email,
      date: stored.date,
      inTime: stored.inTime,
      outTime: outTime,
    };

    form.style.display = "none";

    // ⭐ Show the loader before sending the request
    toggleLoading(true);

    // Send to Google Sheet
    fetch("https://script.google.com/macros/s/AKfycbxEqA0uL7JT2yH3bfFhhttsrwQT9fXqiVHDkXhKxsPM1qXyJptZKeU2bmEOyVsjOd3u/exec", {
      method: "POST",
      mode: "no-cors",
     headers: { "Content-Type": "text/plain" },
    
      body: JSON.stringify(sendData),
    })
    .then(() => {

      // ⭐ Hide the loader (though redirection will happen quickly)
      toggleLoading(false);
    
       window.location.href = "success.html";  

        showMessage(`✅  submitted successfully `, "green");
       localStorage.removeItem("attendanceData");
       localStorage.setItem("lastAttendanceDate", date);
    })
    .catch(error => {

      // ⭐ Hide the loader on error
      toggleLoading(false);

      form.style.display = "block";
      showMessage(`❌ Network error: ${error.message}`, "red");
      console.error("Error submitting Out-Time:", error);
    });
  }
 });
};
