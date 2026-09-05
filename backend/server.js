const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

app.get("/", (req, res) => {
  res.send("Backend Casaku aktif ✅");
});

app.get("/api/transaksi", async (req, res) => {
  try {
    const response = await fetch(
      "https://api.casaku.id/api/generate/list?status=paid&page=1&limit=20&sort=newest",
      {
        headers: {
          "x-license-key": process.env.CASAKU_LICENSE_KEY
        }
      }
    );

    const data = await response.json();

    res.status(response.status).json(data);

  } catch (error) {
    res.status(500).json({
      error: true,
      message: "Gagal terhubung ke Casaku",
      detail: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend Casaku berjalan di port ${PORT}`);
});
