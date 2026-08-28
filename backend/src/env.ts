import "dotenv/config";

function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (value === undefined) {
    throw new Error(`Missing required env var: ${name}`);
  }
  return value;
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  frontendOrigin: required("FRONTEND_ORIGIN", "http://localhost:5173"),
  mongoUri: required("MONGODB_URI", "mongodb://localhost:27017"),
  mongoDb: required("MONGODB_DB", "telegraph_hackathon_submissions"),
  validatorBaseUrl: required("VALIDATOR_BASE_URL"),
  adminPassword: required("ADMIN_PASSWORD", "changeme"),
  uploadDir: required("UPLOAD_DIR", "./uploads"),
  maxUploadMb: Number(process.env.MAX_UPLOAD_MB ?? 5),
};
