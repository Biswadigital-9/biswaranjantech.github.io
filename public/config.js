// ========================================
// BISWARANJAN TECH - FRONTEND CONFIG
// ========================================

const API_BASE_URL = "http://localhost:5000";

// API endpoints
const API = {
  health: `${API_BASE_URL}/api/health`,

  register: `${API_BASE_URL}/api/auth/register`,

  verifyOTP: `${API_BASE_URL}/api/auth/verify-otp`,

  resendOTP: `${API_BASE_URL}/api/auth/resend-otp`,

  login: `${API_BASE_URL}/api/auth/login`,

  me: `${API_BASE_URL}/api/me`,
};

// ========================================
// TOKEN FUNCTIONS
// ========================================

function saveToken(token) {
  localStorage.setItem("bt_auth_token", token);
}

function getToken() {
  return localStorage.getItem("bt_auth_token");
}

function removeToken() {
  localStorage.removeItem("bt_auth_token");
}

// ========================================
// AUTH HEADER
// ========================================

function getAuthHeaders() {
  const token = getToken();

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

// ========================================
// API REQUEST HELPER
// ========================================

async function apiRequest(
  url,
  options = {}
) {
  try {
    const response = await fetch(
      url,
      options
    );

    const data =
      await response.json();

    return {
      ok: response.ok,
      status: response.status,
      data,
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
          "Server connection failed.",
      },
    };
  }
}
