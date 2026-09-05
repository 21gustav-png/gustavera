const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

const PORT = process.env.PORT || 3000;

const CLIENTS = new Set();

/*
=====================================
CORS
=====================================
*/

app.use(cors());


/*
=====================================
WEBHOOK CASAKU
=====================================

PENTING:
Route webhook harus memakai raw body
agar signature Casaku bisa diverifikasi.
*/

app.post(
  "/webhook/casaku",
  express.raw({ type: "application/json" }),
  (req, res) => {

    try {

      const signature =
        req.headers["x-casaku-signature"];

      const secret =
        process.env.WEBHOOK_SECRET;


      if (!signature) {

        return res.status(401).json({
          error: true,
          message: "Signature tidak ditemukan"
        });

      }


      if (!secret) {

        console.error(
          "WEBHOOK_SECRET belum diatur"
        );

        return res.status(500).json({
          error: true,
          message: "Webhook secret belum dikonfigurasi"
        });

      }


      /*
      =====================================
      HITUNG HMAC SHA256
      =====================================
      */

      const expected =
        crypto
          .createHmac("sha256", secret)
          .update(req.body)
          .digest("hex");


      /*
      =====================================
      CEK SIGNATURE
      =====================================
      */

      const receivedBuffer =
        Buffer.from(signature, "hex");

      const expectedBuffer =
        Buffer.from(expected, "hex");


      if (
        receivedBuffer.length !==
        expectedBuffer.length
      ) {

        return res.status(401).json({
          error: true,
          message: "Signature tidak valid"
        });

      }


      const valid =
        crypto.timingSafeEqual(
          receivedBuffer,
          expectedBuffer
        );


      if (!valid) {

        return res.status(401).json({
          error: true,
          message: "Signature tidak valid"
        });

      }


      /*
      =====================================
      PARSE WEBHOOK
      =====================================
      */

      const payload =
        JSON.parse(
          req.body.toString("utf8")
        );


      console.log(
        "Webhook Casaku:",
        payload
      );


      /*
      =====================================
      HANYA TRANSAKSI PAID
      =====================================
      */

      if (
        String(payload.status).toLowerCase() ===
        "paid"
      ) {

        /*
        Kirim transaksi langsung
        ke semua browser yang sedang
        membuka halaman QRIS.
        */

        const message =
          `data: ${JSON.stringify(payload)}\n\n`;


        for (const client of CLIENTS) {

          try {

            client.write(message);

          } catch (error) {

            CLIENTS.delete(client);

          }

        }

      }


      /*
      Casaku harus mendapatkan
      response 200 dengan cepat.
      */

      return res.status(200).json({
        success: true
      });


    } catch (error) {

      console.error(
        "Webhook error:",
        error
      );


      return res.status(500).json({
        error: true,
        message: "Webhook gagal diproses"
      });

    }

  }
);


/*
=====================================
JSON UNTUK ROUTE LAIN
=====================================
*/

app.use(express.json());


/*
=====================================
HOME
=====================================
*/

app.get("/", (req, res) => {

  res.send(
    "Backend Casaku Realtime aktif ✅"
  );

});


/*
=====================================
AMBIL RIWAYAT TRANSAKSI
=====================================
*/

app.get("/api/transaksi", async (req, res) => {

  try {

    const response =
      await fetch(
        "https://api.casaku.id/api/generate/list?status=paid&page=1&limit=20&sort=newest",
        {
          headers: {
            "x-license-key":
              process.env.CASAKU_LICENSE_KEY
          }
        }
      );


    const data =
      await response.json();


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

      message:
        "Gagal terhubung ke Casaku",

      detail:
        error.message

    });

  }

});


/*
=====================================
REALTIME SSE
=====================================
*/

app.get("/api/events", (req, res) => {

  /*
  Header SSE
  */

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


  /*
  Kirim koneksi berhasil
  */

  res.write(
    `data: ${JSON.stringify({
      type: "connected"
    })}\n\n`
  );


  /*
  Simpan browser
  */

  CLIENTS.add(res);


  console.log(
    `Realtime client terhubung. Total: ${CLIENTS.size}`
  );


  /*
  Keep connection hidup
  */

  const heartbeat =
    setInterval(() => {

      try {

        res.write(
          `: heartbeat\n\n`
        );

      } catch (error) {

        clearInterval(heartbeat);
        CLIENTS.delete(res);

      }

    }, 25000);


  /*
  Saat browser menutup halaman
  */

  req.on("close", () => {

    clearInterval(heartbeat);

    CLIENTS.delete(res);


    console.log(
      `Realtime client terputus. Total: ${CLIENTS.size}`
    );

  });

});


/*
=====================================
START SERVER
=====================================
*/

app.listen(
  PORT,
  () => {

    console.log(
      `Backend Casaku Realtime berjalan di port ${PORT}`
    );

  }
);
