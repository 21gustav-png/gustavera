const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());

app.get("/", (req, res) => {
  res.send("Backend Casaku aktif ✅");
});

app.get("/api/transaksi", async (req, res) => {
  try {
    const response = await fetch(
      "https://casaku.id/api/generate/list?status=paid&page=1&limit=20&sort=newest",
      {
        headers: {
          "x-license-key": process.env.CASAKU_LICENSE_KEY
        }
      }
    );

    const data = await response.json();

    res.json(data);
  } catch (error) {
    res.status(500).json({
      error: "Gagal mengambil transaksi"
    });
  }
});

app.listen(process.env.PORT || 3000);
