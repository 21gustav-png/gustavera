const response = await fetch(
  "https://api.casaku.id/api/generate/list?status=paid&page=1&limit=20&sort=newest",
  {
    headers: {
      "x-license-key": process.env.CASAKU_LICENSE_KEY
    }
  }
);
