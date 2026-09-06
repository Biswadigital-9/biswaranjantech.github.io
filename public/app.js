// ========================================
// BISWARANJAN TECH
// MAIN FRONTEND APPLICATION
// ========================================

let registrationEmail = "";
let resendTimer = null;
let resendSeconds = 0;

// ========================================
// DOM HELPER
// ========================================

function $(id) {
  return document.getElementById(id);
}

// ========================================
// MESSAGE
// ========================================

function showMessage(message, type = "info") {
  let box = $("appMessage");

  if (!box) {
    box = document.createElement("div");
    box.id = "appMessage";

    Object.assign(box.style, {
      position: "fixed",
      top: "20px",
      right: "20px",
      zIndex: "9999",
      padding: "14px 18px",
      borderRadius: "10px",
      fontFamily: "Arial",
      maxWidth: "320px",
      boxShadow: "0 5px 20px rgba(0,0,0,.2)"
    });

    document.body.appendChild(box);
  }

  box.textContent = message;

  if (type === "success") {
    box.style.background = "#d1fae5";
    box.style.color = "#065f46";
  } else if (type === "error") {
    box.style.background = "#fee2e2";
    box.style.color = "#991b1b";
  } else {
    box.style.background = "#dbeafe";
    box.style.color = "#1e40af";
  }

  setTimeout(() => {
    if (box) box.remove();
  }, 4000);
}

// ========================================
// REGISTER
// ========================================

async function registerStudent() {
  const fullName = $("fullName")?.value.trim();
  const mobile = $("mobile")?.value.trim();
  const qualification = $("qualification")?.value.trim();
  const email = $("registerEmail")?.value.trim().toLowerCase();
  const password = $("registerPassword")?.value;

  if (
    !fullName ||
    !mobile ||
    !qualification ||
    !email ||
    !password
  ) {
    showMessage(
      "Please fill all registration fields.",
      "error"
    );
    return;
  }

  if (mobile.length < 10) {
    showMessage(
      "Please enter a valid mobile number.",
      "error"
    );
    return;
  }

  if (password.length < 6) {
    showMessage(
      "Password must contain at least 6 characters.",
      "error"
    );
    return;
  }

  const button = $("registerBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Sending OTP...";
  }

  const result = await apiRequest(
    API.register,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        fullName,
        mobile,
        qualification,
        email,
        password
      })
    }
  );

  if (button) {
    button.disabled = false;
    button.textContent = "Register";
  }

  if (!result.ok) {
    showMessage(
      result.data.message ||
        "Registration failed.",
      "error"
    );
    return;
  }

  registrationEmail = email;

  localStorage.setItem(
    "bt_pending_email",
    email
  );

  showOTPSection();

  startResendTimer(
    result.data.resendAfter || 30
  );

  showMessage(
    "OTP sent successfully to your email.",
    "success"
  );
}

// ========================================
// SHOW OTP SECTION
// ========================================

function showOTPSection() {
  const registerSection =
    $("registerSection");

  const otpSection =
    $("otpSection");

  if (registerSection) {
    registerSection.style.display = "none";
  }

  if (otpSection) {
    otpSection.style.display = "block";
  }
}

// ========================================
// VERIFY OTP
// ========================================

async function verifyOTP() {
  const otp = $("otp")?.value.trim();

  const email =
    registrationEmail ||
    localStorage.getItem(
      "bt_pending_email"
    );

  if (!email) {
    showMessage(
      "Registration email not found.",
      "error"
    );
    return;
  }

  if (!otp || otp.length !== 6) {
    showMessage(
      "Please enter the 6-digit OTP.",
      "error"
    );
    return;
  }

  const button = $("verifyOTPBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Verifying...";
  }

  const result = await apiRequest(
    API.verifyOTP,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        otp
      })
    }
  );

  if (button) {
    button.disabled = false;
    button.textContent = "Verify OTP";
  }

  if (!result.ok) {
    showMessage(
      result.data.message ||
        "Invalid OTP.",
      "error"
    );
    return;
  }

  localStorage.removeItem(
    "bt_pending_email"
  );

  registrationEmail = "";

  showMessage(
    "Registration completed successfully! Please login.",
    "success"
  );

  showLoginSection();
}

// ========================================
// RESEND OTP
// ========================================

async function resendOTP() {
  const email =
    registrationEmail ||
    localStorage.getItem(
      "bt_pending_email"
    );

  if (!email) {
    showMessage(
      "Email not found.",
      "error"
    );
    return;
  }

  if (resendSeconds > 0) {
    showMessage(
      `Please wait ${resendSeconds} seconds.`,
      "info"
    );
    return;
  }

  const button =
    $("resendOTPBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Sending...";
  }

  const result = await apiRequest(
    API.resendOTP,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email
      })
    }
  );

  if (!result.ok) {
    if (button) {
      button.disabled = false;
      button.textContent = "Resend OTP";
    }

    showMessage(
      result.data.message ||
        "Could not resend OTP.",
      "error"
    );

    if (result.data.retryAfter) {
      startResendTimer(
        result.data.retryAfter
      );
    }

    return;
  }

  startResendTimer(
    result.data.resendAfter || 30
  );

  showMessage(
    "New OTP sent successfully.",
    "success"
  );
}

// ========================================
// RESEND TIMER
// ========================================

function startResendTimer(seconds) {
  clearInterval(resendTimer);

  resendSeconds = Number(seconds) || 30;

  const button =
    $("resendOTPBtn");

  updateResendButton();

  resendTimer = setInterval(() => {
    resendSeconds--;

    updateResendButton();

    if (resendSeconds <= 0) {
      clearInterval(resendTimer);
    }
  }, 1000);
}

function updateResendButton() {
  const button =
    $("resendOTPBtn");

  if (!button) return;

  if (resendSeconds > 0) {
    button.disabled = true;
    button.textContent =
      `Resend OTP (${resendSeconds}s)`;
  } else {
    button.disabled = false;
    button.textContent =
      "Resend OTP";
  }
}

// ========================================
// LOGIN
// ========================================

async function loginStudent() {
  const email =
    $("loginEmail")?.value
      .trim()
      .toLowerCase();

  const password =
    $("loginPassword")?.value;

  if (!email || !password) {
    showMessage(
      "Enter email and password.",
      "error"
    );
    return;
  }

  const button = $("loginBtn");

  if (button) {
    button.disabled = true;
    button.textContent = "Logging in...";
  }

  const result = await apiRequest(
    API.login,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email,
        password
      })
    }
  );

  if (button) {
    button.disabled = false;
    button.textContent = "Login";
  }

  if (!result.ok) {
    showMessage(
      result.data.message ||
        "Login failed.",
      "error"
    );
    return;
  }

  saveToken(result.data.token);

  localStorage.setItem(
    "bt_user",
    JSON.stringify(
      result.data.user
    )
  );

  showMessage(
    "Login successful! 🎉",
    "success"
  );

  setTimeout(() => {
    showDashboard(
      result.data.user
    );
  }, 500);
}

// ========================================
// LOAD CURRENT USER
// ========================================

async function loadCurrentUser() {
  const token = getToken();

  if (!token) {
    return null;
  }

  const result = await apiRequest(
    API.me,
    {
      method: "GET",
      headers: getAuthHeaders()
    }
  );

  if (!result.ok) {
    removeToken();
    return null;
  }

  localStorage.setItem(
    "bt_user",
    JSON.stringify(
      result.data.user
    )
  );

  return result.data.user;
}

// ========================================
// DASHBOARD
// ========================================

function showDashboard(user) {
  const loginSection =
    $("loginSection");

  const registerSection =
    $("registerSection");

  const otpSection =
    $("otpSection");

  const dashboard =
    $("dashboardSection");

  if (loginSection) {
    loginSection.style.display = "none";
  }

  if (registerSection) {
    registerSection.style.display = "none";
  }

  if (otpSection) {
    otpSection.style.display = "none";
  }

  if (dashboard) {
    dashboard.style.display = "block";
  }

  setUserInformation(user);
}

// ========================================
// USER INFORMATION
// ========================================

function setUserInformation(user) {
  if (!user) return;

  const nameElements = [
    "dashboardName",
    "profileName",
    "welcomeName"
  ];

  nameElements.forEach(id => {
    const element = $(id);

    if (element) {
      element.textContent =
        user.fullName || "Student";
    }
  });

  const emailElement =
    $("profileEmail");

  if (emailElement) {
    emailElement.textContent =
      user.email || "";
  }

  const mobileElement =
    $("profileMobile");

  if (mobileElement) {
    mobileElement.textContent =
      user.mobile || "";
  }

  const qualificationElement =
    $("profileQualification");

  if (qualificationElement) {
    qualificationElement.textContent =
      user.qualification || "";
  }
}

// ========================================
// LOGOUT
// ========================================

function logoutStudent() {
  removeToken();

  localStorage.removeItem(
    "bt_user"
  );

  registrationEmail = "";

  clearInterval(resendTimer);

  showMessage(
    "Logged out successfully.",
    "success"
  );

  setTimeout(() => {
    showLoginSection();
  }, 500);
}

// ========================================
// SHOW LOGIN
// ========================================

function showLoginSection() {
  const login =
    $("loginSection");

  const register =
    $("registerSection");

  const otp =
    $("otpSection");

  const dashboard =
    $("dashboardSection");

  if (login) {
    login.style.display = "block";
  }

  if (register) {
    register.style.display = "none";
  }

  if (otp) {
    otp.style.display = "none";
  }

  if (dashboard) {
    dashboard.style.display = "none";
  }
}

// ========================================
// SHOW REGISTER
// ========================================

function showRegisterSection() {
  const login =
    $("loginSection");

  const register =
    $("registerSection");

  const otp =
    $("otpSection");

  const dashboard =
    $("dashboardSection");

  if (login) {
    login.style.display = "none";
  }

  if (register) {
    register.style.display = "block";
  }

  if (otp) {
    otp.style.display = "none";
  }

  if (dashboard) {
    dashboard.style.display = "none";
  }
}

// ========================================
// BACK TO LOGIN
// ========================================

function backToLogin() {
  showLoginSection();
}

// ========================================
// DARK MODE
// ========================================

function toggleDarkMode() {
  document.body.classList.toggle(
    "dark-mode"
  );

  const enabled =
    document.body.classList.contains(
      "dark-mode"
    );

  localStorage.setItem(
    "bt_dark_mode",
    enabled ? "1" : "0"
  );
}

function loadDarkMode() {
  const enabled =
    localStorage.getItem(
      "bt_dark_mode"
    );

  if (enabled === "1") {
    document.body.classList.add(
      "dark-mode"
    );
  }
}

// ========================================
// CHECK LOGIN ON PAGE LOAD
// ========================================

async function initializeApp() {
  loadDarkMode();

  const token = getToken();

  if (!token) {
    showLoginSection();
    return;
  }

  const user =
    await loadCurrentUser();

  if (user) {
    showDashboard(user);
  } else {
    showLoginSection();
  }
}

// ========================================
// BUTTON EVENT LISTENERS
// ========================================

document.addEventListener(
  "DOMContentLoaded",
  () => {

    const registerBtn =
      $("registerBtn");

    if (registerBtn) {
      registerBtn.addEventListener(
        "click",
        registerStudent
      );
    }

    const verifyBtn =
      $("verifyOTPBtn");

    if (verifyBtn) {
      verifyBtn.addEventListener(
        "click",
        verifyOTP
      );
    }

    const resendBtn =
      $("resendOTPBtn");

    if (resendBtn) {
      resendBtn.addEventListener(
        "click",
        resendOTP
      );
    }

    const loginBtn =
      $("loginBtn");

    if (loginBtn) {
      loginBtn.addEventListener(
        "click",
        loginStudent
      );
    }

    const logoutBtn =
      $("logoutBtn");

    if (logoutBtn) {
      logoutBtn.addEventListener(
        "click",
        logoutStudent
      );
    }

    const registerLink =
      $("showRegisterBtn");

    if (registerLink) {
      registerLink.addEventListener(
        "click",
        showRegisterSection
      );
    }

    const loginLink =
      $("showLoginBtn");

    if (loginLink) {
      loginLink.addEventListener(
        "click",
        showLoginSection
      );
    }

    const darkModeBtn =
      $("darkModeBtn");

    if (darkModeBtn) {
      darkModeBtn.addEventListener(
        "click",
        toggleDarkMode
      );
    }

    initializeApp();
  }
);
