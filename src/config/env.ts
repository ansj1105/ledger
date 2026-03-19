import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

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
  WITHDRAW_SIGNER_API_KEY: z.string().optional()
});

const parsed = schema.parse(process.env);

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
  withdrawSignerApiKey: parsed.WITHDRAW_SIGNER_API_KEY
});
