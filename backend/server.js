const express = require("express");
const cors = require("cors");

const { handleWebhook } = require("./webhook");

const app = express();

const PORT = process.env.PORT || 3000;

const CLIENTS = new Set();

app.use(cors());


/*
========================================
WEBHOOK CASAKU
========================================
*/

// Terima JSON dari Casaku
app.post(
  "/webhook/casaku",
  express.json(),
  (req, res) => {
    handleWebhook(req, res, CLIENTS);
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

  // Beritahu frontend koneksi berhasil
  res.write(
    `data: ${JSON.stringify({
      type: "connected"
    })}\n\n`
  );

  CLIENTS.add(res);

  console.log(
    `Client realtime terhubung. Total: ${CLIENTS.size}`
  );


  /*
  Heartbeat setiap 25 detik
  */

  const heartbeat = setInterval(() => {

    try {
      res.write(": heartbeat\n\n");
    } catch (error) {
      clearInterval(heartbeat);
      CLIENTS.delete(res);
    }

  }, 25000);


  /*
  Browser menutup koneksi
  */

  req.on("close", () => {

    clearInterval(heartbeat);

    CLIENTS.delete(res);

    console.log(
      `Client realtime terputus. Total: ${CLIENTS.size}`
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
