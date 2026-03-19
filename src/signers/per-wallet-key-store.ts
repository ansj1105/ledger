import { createDecipheriv, createHash } from 'node:crypto';
import { Pool } from 'pg';
import { env } from '../config/env.js';

type VirtualWalletRow = {
  wallet_address: string;
  currency_id: number;
  network: 'mainnet' | 'testnet';
  encrypted_private_key: string;
};

type FoxyaWalletRow = {
  address: string;
  currency_id: number;
  private_key: string | null;
};

const IV_LENGTH_BYTES = 16;
const TAG_LENGTH_BYTES = 16;

export class PerWalletKeyStore {
  private readonly coinManagePool = env.coinManageDb
    ? new Pool({
        host: env.coinManageDb.host,
        port: env.coinManageDb.port,
        database: env.coinManageDb.name,
        user: env.coinManageDb.user,
        password: env.coinManageDb.password,
        max: 5
      })
    : undefined;

  private readonly foxyaPool = env.foxyaDb
    ? new Pool({
        host: env.foxyaDb.host,
        port: env.foxyaDb.port,
        database: env.foxyaDb.name,
        user: env.foxyaDb.user,
        password: env.foxyaDb.password,
        max: 5
      })
    : undefined;

  async getVirtualWalletSignerById(virtualWalletId: string) {
    if (!this.coinManagePool || !env.coinManageDb) {
      throw new Error('coin_manage db configuration is required for virtual wallet signing');
    }

    const result = await this.coinManagePool.query<VirtualWalletRow>(
      `
        select wallet_address, currency_id, network, encrypted_private_key
        from virtual_wallet_bindings
        where virtual_wallet_id = $1
          and status = 'active'
        limit 1
      `,
      [virtualWalletId]
    );

    const row = result.rows[0];
    if (!row) {
      return undefined;
    }

    return {
      address: row.wallet_address,
      currencyId: row.currency_id,
      network: row.network,
      privateKey: this.decryptAesGcm(row.encrypted_private_key, env.coinManageDb.virtualWalletEncryptionKey)
    };
  }

  async getFoxyaWalletSignerByAddress(input: { address: string; currencyId: number }) {
    if (!this.foxyaPool || !env.foxyaDb) {
      throw new Error('foxya db configuration is required for foxya wallet signing');
    }

    const result = await this.foxyaPool.query<FoxyaWalletRow>(
      `
        select address, currency_id, private_key
        from user_wallets
        where lower(address) = lower($1)
          and currency_id = $2
          and deleted_at is null
        limit 1
      `,
      [input.address, input.currencyId]
    );

    const row = result.rows[0];
    if (!row?.private_key) {
      return undefined;
    }

    return {
      address: row.address,
      currencyId: row.currency_id,
      privateKey: this.decryptAesGcm(row.private_key, env.foxyaDb.encryptionKey)
    };
  }

  private decryptAesGcm(encryptedValue: string, encryptionKey: string) {
    const data = Buffer.from(encryptedValue, 'hex');
    if (data.length <= IV_LENGTH_BYTES + TAG_LENGTH_BYTES) {
      throw new Error('encrypted private key format is invalid');
    }

    const iv = data.subarray(0, IV_LENGTH_BYTES);
    const cipherAndTag = data.subarray(IV_LENGTH_BYTES);
    const cipherText = cipherAndTag.subarray(0, cipherAndTag.length - TAG_LENGTH_BYTES);
    const authTag = cipherAndTag.subarray(cipherAndTag.length - TAG_LENGTH_BYTES);
    const key = createHash('sha256').update(encryptionKey).digest();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(cipherText), decipher.final()]).toString('utf8');
  }
}
