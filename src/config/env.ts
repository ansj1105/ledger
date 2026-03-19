import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const optionalUrlString = z.preprocess((value) => (value === '' ? undefined : value), z.string().url().optional());
const optionalString = z.preprocess((value) => (value === '' ? undefined : value), z.string().optional());

const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  TRON_API_URL: z.string().url().default('https://api.trongrid.io'),
  MAINNET_TRON_API_URL: z.string().url().default('https://api.trongrid.io'),
  TESTNET_TRON_API_URL: z.string().url().default('https://nile.trongrid.io'),
  TRON_API_KEY: z.string().optional(),
  KORI_TOKEN_CONTRACT_ADDRESS: z.string().optional(),
  MAINNET_KORI_TOKEN_CONTRACT_ADDRESS: z.string().default('TBJZD8RwQ1JcQvEP9BTbPbgBCGxUjxSXnn'),
  TESTNET_KORI_TOKEN_CONTRACT_ADDRESS: z.string().default('TPKZnRjJngnxVgxw52pMPSrCp2wGm7iT9W'),
  TRON_FEE_LIMIT_SUN: z.coerce.number().int().positive().default(100000000),
  HOT_WALLET_ADDRESS: z.string().min(1),
  HOT_WALLET_PRIVATE_KEY: z.string().min(1),
  WITHDRAW_SIGNER_API_KEY: z.string().optional(),
  COIN_MANAGE_DB_HOST: optionalString,
  COIN_MANAGE_DB_PORT: z.coerce.number().int().positive().default(5432),
  COIN_MANAGE_DB_NAME: optionalString,
  COIN_MANAGE_DB_USER: optionalString,
  COIN_MANAGE_DB_PASSWORD: optionalString,
  COIN_MANAGE_VIRTUAL_WALLET_ENCRYPTION_KEY: optionalString,
  FOXYA_DB_HOST: optionalString,
  FOXYA_DB_PORT: z.coerce.number().int().positive().default(5432),
  FOXYA_DB_NAME: optionalString,
  FOXYA_DB_USER: optionalString,
  FOXYA_DB_PASSWORD: optionalString,
  FOXYA_ENCRYPTION_KEY: optionalString,
  SIGNER_ALLOWED_ORIGINS: optionalUrlString
});

const parsed = schema.parse(process.env);

const coinManageDb =
  parsed.COIN_MANAGE_DB_HOST &&
  parsed.COIN_MANAGE_DB_NAME &&
  parsed.COIN_MANAGE_DB_USER &&
  parsed.COIN_MANAGE_VIRTUAL_WALLET_ENCRYPTION_KEY
    ? {
        host: parsed.COIN_MANAGE_DB_HOST,
        port: parsed.COIN_MANAGE_DB_PORT,
        name: parsed.COIN_MANAGE_DB_NAME,
        user: parsed.COIN_MANAGE_DB_USER,
        password: parsed.COIN_MANAGE_DB_PASSWORD,
        virtualWalletEncryptionKey: parsed.COIN_MANAGE_VIRTUAL_WALLET_ENCRYPTION_KEY
      }
    : undefined;

const foxyaDb =
  parsed.FOXYA_DB_HOST && parsed.FOXYA_DB_NAME && parsed.FOXYA_DB_USER && parsed.FOXYA_ENCRYPTION_KEY
    ? {
        host: parsed.FOXYA_DB_HOST,
        port: parsed.FOXYA_DB_PORT,
        name: parsed.FOXYA_DB_NAME,
        user: parsed.FOXYA_DB_USER,
        password: parsed.FOXYA_DB_PASSWORD,
        encryptionKey: parsed.FOXYA_ENCRYPTION_KEY
      }
    : undefined;

export const env = Object.freeze({
  nodeEnv: parsed.NODE_ENV,
  port: parsed.PORT,
  tronApiUrl: parsed.TRON_API_URL,
  mainnetTronApiUrl: parsed.MAINNET_TRON_API_URL,
  testnetTronApiUrl: parsed.TESTNET_TRON_API_URL,
  tronApiKey: parsed.TRON_API_KEY,
  koriTokenContractAddress: parsed.KORI_TOKEN_CONTRACT_ADDRESS,
  mainnetKoriTokenContractAddress: parsed.MAINNET_KORI_TOKEN_CONTRACT_ADDRESS,
  testnetKoriTokenContractAddress: parsed.TESTNET_KORI_TOKEN_CONTRACT_ADDRESS,
  tronFeeLimitSun: parsed.TRON_FEE_LIMIT_SUN,
  hotWalletAddress: parsed.HOT_WALLET_ADDRESS,
  hotWalletPrivateKey: parsed.HOT_WALLET_PRIVATE_KEY,
  withdrawSignerApiKey: parsed.WITHDRAW_SIGNER_API_KEY,
  coinManageDb,
  foxyaDb
});
