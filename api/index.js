const { validateConfig } = require("../backend/config/env");
const { createApp } = require("../backend/app");
let app;
module.exports = (req, res) => {
  try {
    if (!app) {
      validateConfig();
      app = createApp();
    }
    return app(req, res);
  } catch {
    res.statusCode = 503;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Cache-Control", "no-store");
    return res.end(
      JSON.stringify({
        message: "La aplicación requiere configurar sus variables de entorno",
      }),
    );
  }
};
