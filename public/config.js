// ========================================
// BISWARANJAN TECH
// FRONTEND CONFIGURATION
// ========================================

// ----------------------------------------
// API BASE URL
// ----------------------------------------
//
// Local development:
const API_BASE_URL = "http://localhost:5000";
//
// Later hosting kariba bele eita change kariba:
// const API_BASE_URL = "https://api.yourdomain.com";


// ----------------------------------------
// API ENDPOINTS
// ----------------------------------------

const API = {
  health:
    `${API_BASE_URL}/api/health`,

  register:
    `${API_BASE_URL}/api/auth/register`,

  verifyOTP:
    `${API_BASE_URL}/api/auth/verify-otp`,

  resendOTP:
    `${API_BASE_URL}/api/auth/resend-otp`,

  login:
    `${API_BASE_URL}/api/auth/login`,

  me:
    `${API_BASE_URL}/api/me`
};


// ----------------------------------------
// TOKEN MANAGEMENT
// ----------------------------------------

function saveToken(token) {
  localStorage.setItem(
    "bt_auth_token",
    token
  );
}


function getToken() {
  return localStorage.getItem(
    "bt_auth_token"
  );
}


function removeToken() {
  localStorage.removeItem(
    "bt_auth_token"
  );
}


// ----------------------------------------
// AUTH HEADERS
// ----------------------------------------

function getAuthHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",

    Authorization:
      `Bearer ${token}`
  };
}


// ----------------------------------------
// API REQUEST HELPER
// ----------------------------------------

async function apiRequest(
  url,
  options = {}
) {
  try {

    const response =
      await fetch(
        url,
        options
      );

    let data;

    try {
      data =
        await response.json();
    } catch {
      data = {
        success: false,
        message:
          "Invalid server response."
      };
    }

    return {
      ok:
        response.ok,

      status:
        response.status,

      data
    };

  } catch (error) {

    console.error(
      "API Request Error:",
      error
    );

    return {
      ok: false,

      status: 0,

      data: {
        success: false,

        message:
          "Unable to connect to server. Please make sure the backend server is running."
      }
    };
  }
}
