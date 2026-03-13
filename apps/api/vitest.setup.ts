process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/atlas_test";
process.env.REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";
process.env.CORS_ORIGIN = process.env.CORS_ORIGIN ?? "http://localhost:3000";
process.env.JWT_ACCESS_SECRET =
  process.env.JWT_ACCESS_SECRET ?? "test_access_secret_with_min_length_12345";
process.env.JWT_REFRESH_SECRET =
  process.env.JWT_REFRESH_SECRET ?? "test_refresh_secret_with_min_length_12345";
process.env.ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL ?? "15m";
process.env.REFRESH_TOKEN_TTL = process.env.REFRESH_TOKEN_TTL ?? "30d";
