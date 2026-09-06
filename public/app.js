// ========================================
// BISWARANJAN TECH
// MAIN FRONTEND APPLICATION
// ========================================

// Make sure config.js is loaded before this file.

// ========================================
// GLOBAL STATE
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
// MESSAGE DISPLAY
// ========================================

function showMessage(
  message,
  type = "info"
) {
  let box = $("appMessage");

  if (!box) {
    box = document.createElement("div");
    box.id = "appMessage";

    box.style.position = "fixed";
    box.style.top = "20px";
    box.style.right = "20px";
    box.style.zIndex = "9999";
    box.style.padding = "14px 18px";
    box.style.borderRadius = "10px";
    box.style.fontFamily = "Arial";
    box.style.maxWidth = "320px";
    box.style.boxShadow =
      "0 5px 20px rgba(0,0,0,.2)";

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
    if (box) {
      box.remove();
    }
  }, 4000);
}

// ========================================
// REGISTER
// ========================================

async function registerStudent() {
  const fullName =
    $("fullName")?.value.trim();

  const mobile =
    $("mobile")?.value.trim();

  const qualification =
    $("qualification")?.value.trim();

  const email =
    $("registerEmail")?.value
      .trim()
      .toLowerCase();

  const password =
    $("registerPassword")?.value;

  if (
    !fullName ||
    !mobile ||
    !qualification ||
    !email ||
    !password
