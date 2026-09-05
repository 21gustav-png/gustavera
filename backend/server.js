const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

const CLIENTS = new Set();

app.use(cors());
app.use(express.json());

let lastTransactions = [];

/* =========================
   AMBIL TRANSAKSI DARI CASAKU
========================= */

async function getTransactions() {
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

    if (!response.ok) {
      console.error("Casaku Error:", data);
      return null;
    }

    return data?.data?.items || [];
  } catch (error) {
    console.error("Gagal mengambil data Casaku:", error.message);
    return null;
  }
}

/* =========================
   CEK PERUBAHAN TRANSAKSI
========================= */

async function checkTransactions() {
  const transactions = await getTransactions();

  if (!transactions) return;

  const oldIds = new Set(
    lastTransactions.map(tx => tx.transactionId)
  );

  const newTransactions = transactions.filter(
    tx => !oldIds.has(tx.transactionId)
  );

  if (newTransactions.length > 0) {
    console.log(
      `Transaksi baru ditemukan: ${newTransactions.length}`
    );

    const message =
      `data: ${JSON.stringify({
        type: "new_transactions",
        transactions: newTransactions
      })}\n\n`;

    for (const client of CLIENTS) {
      try {
        client.write(message);
      } catch (error) {
        CLIENTS.delete(client);
      }
    }
  }

  lastTransactions = transactions;
}

/* =========================
   HALAMAN UTAMA
========================= */

app.get("/", (req, res) => {
  res.status(200).send(
    "Backend Casaku Realtime Polling aktif ✅"
  );
});

/* =========================
   API TRANSAKSI
========================= */

app.get("/api/transaksi", async (req, res) => {
  try {
    const transactions = await getTransactions();

    if (transactions === null) {
      return res.status(500).json({
        error: true,
        message: "Gagal terhubung ke Casaku"
      });
    }

    return res.status(200).json({
      status: 200,
      data: {
        page: 1,
        limit: 20,
        total: transactions.length,
        pages: 1,
        items: transactions
      }
    });

  } catch (error) {
    return res.status(500).json({
      error: true,
      message: error.message
    });
  }
});

/* =========================
   REALTIME SSE
========================= */

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
    `Client realtime terhubung. Total: ${CLIENTS.size}`
  );

  const heartbeat = setInterval(() => {
    try {
      res.write(": heartbeat\n\n");
    } catch {
      clearInterval(heartbeat);
      CLIENTS.delete(res);
    }
  }, 25000);

  req.on("close", () => {
    clearInterval(heartbeat);
    CLIENTS.delete(res);

    console.log(
      `Client realtime terputus. Total: ${CLIENTS.size}`
    );
  });
});

/* =========================
   POLLING CASAKU
========================= */

setInterval(() => {
  checkTransactions();
}, 5000);

/* =========================
   START SERVER
========================= */

app.listen(PORT, () => {
  console.log(
    `Backend Casaku Polling berjalan di port ${PORT}`
  );

  // Ambil data pertama kali
  checkTransactions();
});
