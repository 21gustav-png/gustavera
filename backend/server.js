const express = require("express");
const cors = require("cors");

const app = express();

const PORT = process.env.PORT || 3000;

// ===============================
// KONFIGURASI CASAKU
// ===============================

const CASAKU_API = "https://api.casaku.id";

// ID QRIS Casaku kamu
const QR_ID = "c31296af-1d1b-476c-8246-5db109d2b5e7";

// License Key JANGAN ditulis di sini.
// Ambil dari Environment Variable Abasthan.
const LICENSE_KEY = process.env.CASAKU_LICENSE_KEY;

// ===============================
// MIDDLEWARE
// ===============================

app.use(cors());
app.use(express.json());

// ===============================
// CEK BACKEND
// ===============================

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Backend Casaku aktif",
    qr_id: QR_ID
  });
});

// ===============================
// CEK KONFIGURASI
// ===============================

app.get("/api/config", (req, res) => {
  res.json({
    success: true,
    qr_id: QR_ID,
    license_configured: !!LICENSE_KEY
  });
});

// ===============================
// GENERATE TRANSAKSI QRIS
// ===============================

app.post("/api/generate", async (req, res) => {
  try {
    if (!LICENSE_KEY) {
      return res.status(500).json({
        success: false,
        message: "CASAKU_LICENSE_KEY belum dipasang di Environment Variable"
      });
    }

    const { amount } = req.body;

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Amount harus lebih dari 0"
      });
    }

    const response = await fetch(
      `${CASAKU_API}/api/generate/v2/qris`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-license-key": LICENSE_KEY
        },
        body: JSON.stringify({
          qr_id: QR_ID,
          amount: Number(amount),

          // Sesuaikan package ID dengan package yang
          // tersedia di akun Casaku kamu.
          packageIds: ["id.dana"],

          qrType: "static",
          paymentMethod: "qris",
          useQris: true
        })
      }
    );

    const data = await response.json();

    console.log("Casaku Generate:", response.status, data);

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Generate error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal terhubung ke Casaku",
      detail: error.message
    });
  }
});

// ===============================
// CEK TRANSAKSI
// ===============================

app.post("/api/check-status", async (req, res) => {
  try {
    if (!LICENSE_KEY) {
      return res.status(500).json({
        success: false,
        message: "CASAKU_LICENSE_KEY belum dipasang"
      });
    }

    const { transactionId } = req.body;

    if (!transactionId) {
      return res.status(400).json({
        success: false,
        message: "transactionId wajib diisi"
      });
    }

    const response = await fetch(
      `${CASAKU_API}/api/generate/check-status`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-license-key": LICENSE_KEY
        },
        body: JSON.stringify({
          transactionId
        })
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("Check status error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengecek transaksi",
      detail: error.message
    });
  }
});

// ===============================
// LIST TRANSAKSI PAID
// ===============================

app.get("/api/transaksi", async (req, res) => {
  try {
    if (!LICENSE_KEY) {
      return res.status(500).json({
        success: false,
        message: "CASAKU_LICENSE_KEY belum dipasang"
      });
    }

    const response = await fetch(
      `${CASAKU_API}/api/generate/list?status=paid&page=1&limit=20&sort=newest`,
      {
        headers: {
          "x-license-key": LICENSE_KEY
        }
      }
    );

    const data = await response.json();

    return res.status(response.status).json(data);

  } catch (error) {
    console.error("List transaksi error:", error);

    return res.status(500).json({
      success: false,
      message: "Gagal mengambil transaksi Casaku"
    });
  }
});

// ===============================
// START SERVER
// ===============================

app.listen(PORT, () => {
  console.log("=================================");
  console.log("Backend Casaku aktif");
  console.log("QR ID:", QR_ID);
  console.log("License:", LICENSE_KEY ? "TERPASANG" : "BELUM TERPASANG");
  console.log("Port:", PORT);
  console.log("=================================");
});
