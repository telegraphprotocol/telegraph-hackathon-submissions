module.exports = {
  apps: [
    {
      name: "submission-backend",
      script: "dist/index.js",
      cwd: __dirname + "/backend",
      env: { NODE_ENV: "production", PORT: 4000 },
    },
    {
      name: "submission-frontend",
      script: "npx",
      args: "serve -s dist -l 4173",
      cwd: __dirname + "/frontend",
    },
    {
      name: "mention-checker-api",
      script: "app.py",
      interpreter: __dirname + "/mention-checker-api/venv/bin/python",
      cwd: __dirname + "/mention-checker-api",
      env: { PORT: 3100 },
    },
  ],
};
