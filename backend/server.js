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

app.post(
  "/webhook/casaku",
  express.raw({ type: "application/json" }),
  (req, res) => {
    try {
      const secret = process.env.WEBHOOK_SECRET;
      const signature = req.headers["x-casaku-signature"];

      if (!secret) {
        console.error("WEBHOOK_SECRET belum tersedia");
        return res.status(500).json({
          success: false,
          message: "WEBHOOK_SECRET belum dikonfigurasi"
        });
      }

      if (!signature) {
        return res.status(401).json({
          success: false,
          message: "Signature tidak ditemukan"
        });
      }

      const expected = crypto
        .createHmac("sha256", secret)
        .update(req.body)
        .digest("hex");

      const receivedBuffer = Buffer.from(signature, "hex");
      const expectedBuffer = Buffer.from(expected, "hex");

      if (
        receivedBuffer.length !== expectedBuffer.length ||
        !crypto.timingSafeEqual(
          receivedBuffer,
          expectedBuffer
        )
      ) {
        return res.status(401).json({
          success: false,
          message: "Signature tidak valid"
        });
      }

      const payload = JSON.parse(
        req.body.toString("utf8")
      );

      console.log("Webhook Casaku:", payload);

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

      return res.status(200).json({
        success: true
      });

    } catch (error) {
      console.error("Webhook error:", error);

      return res.status(500).json({
        success: false,
        message: "Webhook gagal diproses"
      });
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

    return res
      .status(response.status)
      .json(data);

  } catch (error) {
    console.error(
      "Casaku API error:",
      error
    );

    return res.status(500).json({
      error: true,
      message: "Gagal terhubung ke Casaku",
      detail: error.message
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

  res.write(
    `data: ${JSON.stringify({
      type: "connected"
    })}\n\n`
  );

  CLIENTS.add(res);

  console.log(
    `Realtime client terhubung. Total: ${CLIENTS.size}`
  );

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
      `Realtime client terputus. Total: ${CLIENTS.size}`
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
