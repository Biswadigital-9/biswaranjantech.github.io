require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ===============================
// CONFIG
// ===============================

const PORT = process.env.PORT || 5000;

const OTP_EXPIRE_MINUTES =
  Number(process.env.OTP_EXPIRE_MINUTES) || 5;

const OTP_RESEND_SECONDS =
  Number(process.env.OTP_RESEND_SECONDS) || 30;

// ===============================
// MONGODB CONNECTION
// ===============================

mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("✅ MongoDB Connected");
  })
  .catch((error) => {
    console.error("❌ MongoDB Connection Error:", error.message);
  });

// ===============================
// USER SCHEMA
// ===============================

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    mobile: {
      type: String,
      required: true,
      trim: true,
    },

    qualification: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    otpHash: {
      type: String,
      default: null,
    },

    otpExpiresAt: {
      type: Date,
      default: null,
    },

    otpAttempts: {
      type: Number,
      default: 0,
    },

    lastOtpSentAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model("User", userSchema);

// ===============================
// EMAIL CONFIGURATION
// ===============================

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// ===============================
// HELPER FUNCTIONS
// ===============================

function generateOTP() {
  return crypto
    .randomInt(100000, 1000000)
    .toString();
}

function hashOTP(otp) {
  return crypto
    .createHash("sha256")
    .update(otp)
    .digest("hex");
}

function createToken(user) {
  return jwt.sign(
    {
      userId: user._id.toString(),
      email: user.email,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: "7d",
    }
  );
}

async function sendOTPEmail(email, otp) {
  await transporter.sendMail({
    from: `"BISWARANJAN TECH" <${process.env.SMTP_USER}>`,
    to: email,
    subject: "Your OTP for BISWARANJAN TECH Registration",

    text: `
Hello,

Your OTP for BISWARANJAN TECH registration is:

${otp}

This OTP will expire in ${OTP_EXPIRE_MINUTES} minutes.

If you did not request this OTP, please ignore this email.

Regards,
BISWARANJAN TECH
IT Student Learning Hub
`,

    html: `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:20px">
        <h2>BISWARANJAN TECH</h2>

        <p>Hello,</p>

        <p>Your registration OTP is:</p>

        <h1 style="letter-spacing:8px">${otp}</h1>

        <p>
          This OTP will expire in
          <b>${OTP_EXPIRE_MINUTES} minutes</b>.
        </p>

        <p>
          If you did not request this OTP, please ignore this email.
        </p>

        <hr>

        <p>
          <b>BISWARANJAN TECH</b><br>
          IT Student Learning Hub
        </p>
      </div>
    `,
  });
}

// ===============================
// RATE LIMITERS
// ===============================

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,

  message: {
    success: false,
    message:
      "Too many requests. Please try again later.",
  },

  standardHeaders: true,
  legacyHeaders: false,
});

// ===============================
// HEALTH CHECK
// ===============================

app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "BISWARANJAN TECH API is running 🚀",
  });
});

// ===============================
// REGISTER
// ===============================

app.post(
  "/api/auth/register",
  authLimiter,
  async (req, res) => {
    try {
      const {
        fullName,
        mobile,
        qualification,
        email,
        password,
      } = req.body;

      // Validation
      if (
        !fullName ||
        !mobile ||
        !qualification ||
        !email ||
        !password
      ) {
        return res.status(400).json({
          success: false,
          message: "All fields are required.",
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          success: false,
          message:
            "Password must contain at least 6 characters.",
        });
      }

      const normalizedEmail =
        email.toLowerCase().trim();

      // Check existing user
      let user = await User.findOne({
        email: normalizedEmail,
      });

      // Already verified
      if (user && user.isVerified) {
        return res.status(409).json({
          success: false,
          message:
            "Email already registered. Please login.",
        });
      }

      // Password hashing
      const hashedPassword =
        await bcrypt.hash(password, 12);

      // Generate OTP
      const otp = generateOTP();
      const otpHash = hashOTP(otp);

      const otpExpiresAt = new Date(
        Date.now() +
          OTP_EXPIRE_MINUTES * 60 * 1000
      );

      // Create or update pending user
      if (!user) {
        user = new User({
          fullName,
          mobile,
          qualification,
          email: normalizedEmail,
          password: hashedPassword,
          isVerified: false,
          otpHash,
          otpExpiresAt,
          otpAttempts: 0,
          lastOtpSentAt: new Date(),
        });
      } else {
        user.fullName = fullName;
        user.mobile = mobile;
        user.qualification = qualification;
        user.password = hashedPassword;
        user.otpHash = otpHash;
        user.otpExpiresAt = otpExpiresAt;
        user.otpAttempts = 0;
        user.lastOtpSentAt = new Date();
      }

      await user.save();

      // Send email
      await sendOTPEmail(
        normalizedEmail,
        otp
      );

      res.status(201).json({
        success: true,
        message:
          "Registration started. OTP sent to your email.",
        email: normalizedEmail,
        resendAfter: OTP_RESEND_SECONDS,
      });
    } catch (error) {
      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Registration failed. Please try again.",
      });
    }
  }
);

// ===============================
// VERIFY OTP
// ===============================

app.post(
  "/api/auth/verify-otp",
  authLimiter,
  async (req, res) => {
    try {
      const { email, otp } = req.body;

      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          message:
            "Email and OTP are required.",
        });
      }

      const user = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message: "Email already verified.",
        });
      }

      // Maximum OTP attempts
      if (user.otpAttempts >= 5) {
        return res.status(429).json({
          success: false,
          message:
            "Too many incorrect OTP attempts. Please request a new OTP.",
        });
      }

      // OTP expiry
      if (
        !user.otpExpiresAt ||
        user.otpExpiresAt.getTime() <
          Date.now()
      ) {
        return res.status(400).json({
          success: false,
          message:
            "OTP expired. Please request a new OTP.",
        });
      }

      const submittedHash =
        hashOTP(otp.toString().trim());

      if (submittedHash !== user.otpHash) {
        user.otpAttempts += 1;
        await user.save();

        return res.status(400).json({
          success: false,
          message: "Invalid OTP.",
          attemptsLeft:
            5 - user.otpAttempts,
        });
      }

      // Verification successful
      user.isVerified = true;
      user.otpHash = null;
      user.otpExpiresAt = null;
      user.otpAttempts = 0;

      await user.save();

      res.json({
        success: true,
        message:
          "Email verified successfully. Registration complete.",
      });
    } catch (error) {
      console.error(
        "VERIFY OTP ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "OTP verification failed.",
      });
    }
  }
);

// ===============================
// RESEND OTP
// ===============================

app.post(
  "/api/auth/resend-otp",
  authLimiter,
  async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email is required.",
        });
      }

      const user = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      if (user.isVerified) {
        return res.status(400).json({
          success: false,
          message:
            "Email is already verified.",
        });
      }

      // 30 second resend protection
      if (user.lastOtpSentAt) {
        const secondsPassed =
          (Date.now() -
            user.lastOtpSentAt.getTime()) /
          1000;

        if (
          secondsPassed <
          OTP_RESEND_SECONDS
        ) {
          const remaining = Math.ceil(
            OTP_RESEND_SECONDS -
              secondsPassed
          );

          return res.status(429).json({
            success: false,
            message:
              `Please wait ${remaining} seconds before requesting another OTP.`,
            retryAfter: remaining,
          });
        }
      }

      const otp = generateOTP();
      const otpHash = hashOTP(otp);

      user.otpHash = otpHash;

      user.otpExpiresAt = new Date(
        Date.now() +
          OTP_EXPIRE_MINUTES * 60 * 1000
      );

      user.otpAttempts = 0;
      user.lastOtpSentAt = new Date();

      await user.save();

      await sendOTPEmail(
        user.email,
        otp
      );

      res.json({
        success: true,
        message: "New OTP sent.",
        resendAfter: OTP_RESEND_SECONDS,
      });
    } catch (error) {
      console.error(
        "RESEND OTP ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not resend OTP.",
      });
    }
  }
);

// ===============================
// LOGIN
// ===============================

app.post(
  "/api/auth/login",
  authLimiter,
  async (req, res) => {
    try {
      const { email, password } =
        req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message:
            "Email and password are required.",
        });
      }

      const user = await User.findOne({
        email: email.toLowerCase().trim(),
      });

      if (!user) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password.",
        });
      }

      if (!user.isVerified) {
        return res.status(403).json({
          success: false,
          message:
            "Please verify your email first.",
        });
      }

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password
        );

      if (!passwordMatch) {
        return res.status(401).json({
          success: false,
          message:
            "Invalid email or password.",
        });
      }

      const token =
        createToken(user);

      res.json({
        success: true,
        message: "Login successful.",
        token,

        user: {
          id: user._id,
          fullName: user.fullName,
          mobile: user.mobile,
          qualification:
            user.qualification,
          email: user.email,
        },
      });
    } catch (error) {
      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Login failed. Please try again.",
      });
    }
  }
);

// ===============================
// AUTH MIDDLEWARE
// ===============================

function authenticateToken(
  req,
  res,
  next
) {
  const authHeader =
    req.headers.authorization;

  if (
    !authHeader ||
    !authHeader.startsWith("Bearer ")
  ) {
    return res.status(401).json({
      success: false,
      message:
        "Authentication required.",
    });
  }

  const token =
    authHeader.split(" ")[1];

  try {
    const decoded =
      jwt.verify(
        token,
        process.env.JWT_SECRET
      );

    req.user = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      message:
        "Invalid or expired token.",
    });
  }
}

// ===============================
// GET CURRENT USER
// ===============================

app.get(
  "/api/me",
  authenticateToken,
  async (req, res) => {
    try {
      const user =
        await User.findById(
          req.user.userId
        ).select(
          "-password -otpHash -otpExpiresAt -otpAttempts"
        );

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "User not found.",
        });
      }

      res.json({
        success: true,
        user,
      });
    } catch (error) {
      console.error(
        "ME ERROR:",
        error
      );

      res.status(500).json({
        success: false,
        message:
          "Could not load profile.",
      });
    }
  }
);

// ===============================
// 404 HANDLER
// ===============================

app.use(
  (req, res) => {
    res.status(404).json({
      success: false,
      message:
        "API endpoint not found.",
    });
  }
);

// ===============================
// GLOBAL ERROR HANDLER
// ===============================

app.use(
  (error, req, res, next) => {
    console.error(
      "SERVER ERROR:",
      error
    );

    res.status(500).json({
      success: false,
      message:
        "Internal server error.",
    });
  }
);

// ===============================
// START SERVER
// ===============================

app.listen(
  PORT,
  () => {
    console.log("");
    console.log(
      "========================================"
    );
    console.log(
      "🚀 BISWARANJAN TECH SERVER STARTED"
    );
    console.log(
      `🌐 http://localhost:${PORT}`
    );
    console.log(
      `❤️  http://localhost:${PORT}/api/health`
    );
    console.log(
      "========================================"
    );
    console.log("");
  }
);
