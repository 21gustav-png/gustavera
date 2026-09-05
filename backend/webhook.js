function handleWebhook(req, res, clients) {
  try {
    const payload = req.body || {};

    console.log("Webhook Casaku diterima:", payload);

    // SELALU BALAS 200 KE CASAKU
    // supaya webhook dianggap berhasil diterima.
    res.status(200).json({
      success: true,
      message: "Webhook diterima"
    });

    // Hanya teruskan transaksi PAID
    if (String(payload.status).toLowerCase() !== "paid") {
      return;
    }

    const message = `data: ${JSON.stringify(payload)}\n\n`;

    for (const client of clients) {
      try {
        client.write(message);
      } catch (error) {
        clients.delete(client);
      }
    }

    console.log("Transaksi PAID dikirim realtime.");

  } catch (error) {
    console.error("Webhook error:", error);

    // Jangan membuat Casaku menerima 500
    if (!res.headersSent) {
      res.status(200).json({
        success: true,
        message: "Webhook diterima"
      });
    }
  }
}

module.exports = {
  handleWebhook
};
