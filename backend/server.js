const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENTS = new Set();

app.use(cors());

/*
========================================
WEBHOOK CASAKU
========================================
*/

// Endpoint webhook
app.post(
  "/webhook/casaku",
  express.raw({ type: "application/json" }),
  (req, res) => {
    // Selalu balas 200 terlebih dahulu agar Casaku
    // menganggap endpoint webhook aktif.
    res.status(200).json({
      success: true,
      message: "Webhook diterima"
    });

    try {
      const secret = process.env.WEBHOOK_SECRET;

      if (!secret) {
        console.error("WEBHOOK_SECRET belum tersedia.");
        return;
      }

      const signature = req.headers["x-casaku-signature"];

      if (!signature) {
        console.error("Signature Casaku tidak ditemukan.");
        return;
      }

      const expected = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      const receivedBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expected, "hex");

      if (receivedBuffer.length !== expectedBuffer.length) {
        console.error("Signature tidak valid.");
        return;
      }

      const valid = crypto.timingSafeEqual(
        receivedBuffer,
        expectedBuffer
      );

      if (!valid) {
        console.error("Signature tidak valid.");
        return;
      }

      const payload = JSON.parse(
        req.body.toString("utf8")
      );

      console.log("Webhook Casaku:", payload);

      // Hanya kirim transaksi yang sudah PAID
      if (
        String(payload.status).toLowerCase() === "paid"
      ) {
        const message =
          `data: ${JSON.stringify(payload)}\n\n`;

        for (const client of CLIENTS) {
          try {
            client.write(message);
          } catch (error) {
            CLIENTS.delete(client);
          }
        }

        console.log(
          "Transaksi PAID dikirim realtime."
        );
      }

    } catch (error) {
      console.error(
        "Error memproses webhook:",
        error
      );
    }
  }
);


/*
========================================
TEST BACKEND
========================================
*/

app.get("/", (req, res) => {
  res.status(200).send(
    "Backend Casaku Realtime aktif ✅"
  );
});


/*
========================================
RIWAYAT TRANSAKSI CASAKU
========================================
*/

app.get("/api/transaksi", async (req, res) => {
  try {

    const response = await fetch(
      "https://api.casaku.id/api/generate/list?status=paid&page=1&limit=20&sort=newest",
      {
        headers: {
          "x-license-key":
            process.env.CASAKU_LICENSE_KEY
        }
      }
    );

    const data = await response.json();

    res
      .status(response.status)
      .json(data);

  } catch (error) {

    console.error(
      "Casaku API error:",
      error
    );

    res.status(500).json({
      error: true,
      message: "Gagal terhubung ke Casaku"
    });

  }
});


/*
========================================
REALTIME SSE
========================================
*/

app.get("/api/events", (req, res) => {

  res.setHeader(
    "Content-Type",
    "text/event-stream"
  );

  res.setHeader(
    "Cache-Control",
    "no-cache"
  );

  res.setHeader(
    "Connection",
    "keep-alive"
  );

  res.setHeader(
    "Access-Control-Allow-Origin",
    "*"
  );

  // Tes koneksi
  res.write(
    `data: ${JSON.stringify({
      type: "connected"
    })}\n\n`
  );

  CLIENTS.add(res);

  console.log(
    `Client realtime terhubung: ${CLIENTS.size}`
  );


  // Heartbeat
  const heartbeat = setInterval(() => {

    try {

      res.write(": heartbeat\n\n");

    } catch (error) {

      clearInterval(heartbeat);
      CLIENTS.delete(res);

    }

  }, 25000);


  req.on("close", () => {

    clearInterval(heartbeat);
    CLIENTS.delete(res);

    console.log(
      `Client realtime terputus: ${CLIENTS.size}`
    );

  });

});


/*
========================================
START SERVER
========================================
*/

app.listen(PORT, () => {

  console.log(
    `Backend Casaku Realtime berjalan di port ${PORT}`
  );

});
