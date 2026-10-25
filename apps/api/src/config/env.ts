function getRequiredEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (!value) {
    throw new Error(`❌ [CONFIG ERROR]: Thiếu biến môi trường "${key}" trong apps/api/.env!`);
  }
  return value;
}

export const env = {
  PORT: Number(getRequiredEnv('PORT', '3001')),
  NODE_ENV: getRequiredEnv('NODE_ENV', 'development'),
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  INTERNAL_SERVICE_KEY: getRequiredEnv('INTERNAL_SERVICE_KEY'),
  ALLOWED_ORIGINS: getRequiredEnv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',').map(item => item.trim()) //tránh trường hợp khoảng trống,
};