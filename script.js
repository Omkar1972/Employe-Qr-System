

window.onload = function () {
  const form = document.getElementById("attendanceForm");
  const dateField = document.getElementById("date");
  const timeField = document.getElementById("time");
  const statusField = document.getElementById("status");
  const msgDiv = document.getElementById("message");
  const loader = document.getElementById("loader");
  const submitButton = form.querySelector('button[type="submit"]');

// testing location
//  21.132891629861884,79.11671430170571
  // 

  // --- Allowed Multiple Locations ---
  const ALLOWED_LOCATIONS = [
    { lat: 21.13092947063975, lng: 79.11654813692904, radius: 200 }, // Tiranga Branch
    { lat: 21.115247212063938, lng:  79.01166670397053, radius: 200 }, // Bansi Branch
      
  ];

  // --- Auto Date ---
  const today = new Date();
  const formattedDate = today.toISOString().split("T")[0];
  dateField.value = formattedDate;

  // --- Auto Time (updates every second) ---
  function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit"
    });
  }
  setInterval(() => {
    timeField.value = getCurrentTime();
  }, 1000);

  // --- Show message helper ---
  function showMessage(text, color) {
    msgDiv.style.display = "block";
    msgDiv.innerText = text;
    msgDiv.style.color = color;
  }

  // --- Loader toggle ---
  function toggleLoading(isLoading, text = "Submit") {
    loader.style.display = isLoading ? "block" : "none";
    submitButton.disabled = isLoading;
    submitButton.innerText = isLoading ? text : "Submit";
  }

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

  // --- Already Submitted Check ---
  const lastSubmission = JSON.parse(localStorage.getItem("lastSubmission"));
  if (lastSubmission && lastSubmission.date === formattedDate) {
    msgDiv.innerText = "✅ You have already submitted today's attendance!";
    msgDiv.style.display = "block";
    form.style.display = "none";
    return;
  }

  // --- Set Default Status ---
  const storedAttendance = JSON.parse(localStorage.getItem("attendanceData"));
  statusField.value =
    storedAttendance && storedAttendance.date === formattedDate ? "Out" : "In";

  // --- Distance Calculator ---
  function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3;
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) *
      Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  // --- Check Location (supports multiple allowed locations) ---
  function checkLocation(callback) {
    toggleLoading(true, "Checking location...");

    if (!navigator.geolocation) {
      toggleLoading(false);
      showMessage("❌ Geolocation not supported!", "red");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        let allowed = false;
        for (const loc of ALLOWED_LOCATIONS) {
          const distance = calculateDistance(userLat, userLng, loc.lat, loc.lng);
          console.log("Distance to location:", Math.round(distance), "meters");
          if (distance <= loc.radius) {
            allowed = true;
            break;
          }
        }

        toggleLoading(false);
        if (allowed) {
          showMessage("✅ You are inside the allowed area.", "green");
          if (callback) callback(true);
        } else {
          showMessage("❌ You are outside all allowed areas.", "red");
          if (callback) callback(false);
        }
      },
      (error) => {
        toggleLoading(false);
        showMessage("❌ Unable to access location. Please allow GPS.", "red");
        if (callback) callback(false);
      }
    );
  }

  // --- Auto check location on form load ---
  checkLocation();

  // --- Submit Handler ---
  form.addEventListener("submit", function (e) {
    e.preventDefault();

    const name = document.getElementById("name").value.trim();
    const mobile = document.getElementById("mobile").value.trim();
    const email = document.getElementById("email").value.trim();
    const date = dateField.value;
    const time = timeField.value;
    const status = statusField.value;

    if (!name || !mobile || !email) {
      showMessage("⚠️ Please fill all required fields!", "red");
      return;
    }

    if (!savedUser) {
      localStorage.setItem("userInfo", JSON.stringify({ name, mobile, email }));
    }

    // Check location again before submitting
    checkLocation((allowed) => {
      if (!allowed) return;

      toggleLoading(true, "Submitting...");

      if (status === "In") {
        const sendData = { name, mobile, email, date, inTime: time, outTime: "" };
        localStorage.setItem("attendanceData", JSON.stringify(sendData));

        fetch("https://script.google.com/macros/s/AKfycbybugpEBbLntOFcMUvvjKcfoNzEfRkrvCUPIVcsa9INXMEjdO3KZ_pllpJlQmfRbFk8/exec", {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(sendData),
        })
        .then(() => {
          toggleLoading(false);
          showMessage("✅ Attendance submitted successfully!", "green");
          statusField.value = "Out";
          localStorage.setItem("lastSubmission", JSON.stringify({ date }));
          window.location.href = "success.html";
        })
        .catch((error) => {
          toggleLoading(false);
          showMessage(`❌ Network error: ${error.message}`, "red");
        });

      } else if (status === "Out") {
        const stored = JSON.parse(localStorage.getItem("attendanceData"));
        if (!stored) {
          showMessage("⚠️ Please mark 'In' first!", "red");
          return;
        }

        const sendData = {
          name: stored.name,
          mobile: stored.mobile,
          email: stored.email,
          date: stored.date,
          inTime: stored.inTime,
          outTime: time
        };

        fetch("https://script.google.com/macros/s/AKfycbybugpEBbLntOFcMUvvjKcfoNzEfRkrvCUPIVcsa9INXMEjdO3KZ_pllpJlQmfRbFk8/exec", {
          method: "POST",
          mode: "no-cors",
          headers: { "Content-Type": "text/plain" },
          body: JSON.stringify(sendData),
        })
        .then(() => {
          toggleLoading(false);
          localStorage.removeItem("attendanceData");
          localStorage.setItem("lastSubmission", JSON.stringify({ date }));
          showMessage("✅ Attendance submitted successfully!", "green");
          window.location.href = "success.html";
        })
        .catch((error) => {
          toggleLoading(false);
          showMessage(`❌ Network error: ${error.message}`, "red");
        });
      }
    });
  });
};

