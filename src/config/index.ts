import * as dotenv from 'dotenv';
import { Logger } from '@nestjs/common';

dotenv.config();

export type ConfigType = {
  API_PORT: number;
  JWT_SECRET: string;
  JWT_ACCESS_EXPIRES_IN: string;
  JWT_REFRESH_EXPIRES_IN: string;
  NODE_ENV: string;
  SMTP_HOST: string;
  SMTP_PORT: number;
  SMTP_USER: string;
  SMTP_PASS: string;
  SMTP_FROM: string;
  OTPSECRET: string;
  ESKIZ_BASE_URL: string;
  ESKIZ_EMAIL: string;
  ESKIZ_PASSWORD: string;
};

const requiredVariables = [
  'API_PORT',
  'JWT_SECRET',
  'JWT_ACCESS_EXPIRES_IN',
  'JWT_REFRESH_EXPIRES_IN',
  'NODE_ENV',
  'SMTP_HOST',
  'SMTP_PORT',
  'SMTP_USER',
  'SMTP_PASS',
  'SMTP_FROM',
  'OTPSECRET',
  'ESKIZ_BASE_URL',
  'ESKIZ_EMAIL',
  'ESKIZ_PASSWORD',
];

const missingVariables = requiredVariables.filter((variable) => {
  const value = process.env[variable];
  return !value || value.trim() === '';
});

if (missingVariables.length > 0) {
  Logger.error(
    `Missing or empty required environment variables: ${missingVariables.join(', ')}`,
  );
  process.exit(1);
}

export const config: ConfigType = {
  API_PORT: parseInt(process.env.API_PORT as string, 10),
  JWT_SECRET: process.env.JWT_SECRET as string,
  JWT_ACCESS_EXPIRES_IN: process.env.JWT_ACCESS_EXPIRES_IN as string,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN as string,
  NODE_ENV: process.env.NODE_ENV as string,
  SMTP_HOST: process.env.SMTP_HOST as string,
  SMTP_PORT: parseInt(process.env.SMTP_PORT as string, 10),
  SMTP_USER: process.env.SMTP_USER as string,
  SMTP_PASS: process.env.SMTP_PASS as string,
  SMTP_FROM: process.env.SMTP_FROM as string,
  OTPSECRET: process.env.OTPSECRET as string,
  ESKIZ_BASE_URL: process.env.ESKIZ_BASE_URL as string,
  ESKIZ_EMAIL: process.env.ESKIZ_EMAIL as string,
  ESKIZ_PASSWORD: process.env.ESKIZ_PASSWORD as string
};
