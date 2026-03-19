import express from 'express';
import {
  withdrawalSignerBroadcastRequestSchema,
  withdrawalSignerBroadcastResponseSchema,
  WITHDRAW_SIGNER_SCHEMA_VERSION
} from '../contracts/withdraw-signer-contracts.js';
import {
  perWalletActivationReclaimRequestSchema,
  perWalletFoxyaSweepRequestSchema,
  perWalletSignerTxResponseSchema,
  PER_WALLET_SIGNER_SCHEMA_VERSION
} from '../contracts/per-wallet-signer-contracts.js';
import {
  tronSignerBroadcastNativeRequestSchema,
  tronSignerBroadcastTransferRequestSchema,
  tronSignerResourceRequestSchema,
  tronSignerTxResponseSchema,
  TRON_SIGNER_SCHEMA_VERSION
} from '../contracts/tron-signer-contracts.js';
import { requireInternalApiKey } from '../utils/auth.js';
import { TronSignerService } from '../tron/tron-signer-service.js';
import { PerWalletKeyStore } from '../signers/per-wallet-key-store.js';

export const createApp = () => {
  const app = express();
  const signerService = new TronSignerService();
  const perWalletKeyStore = new PerWalletKeyStore();

  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'ledger-signer-service',
      timestamp: new Date().toISOString()
    });
  });

  app.post('/api/internal/signer/withdrawals/:withdrawalId/broadcast', requireInternalApiKey, async (req, res) => {
    try {
      const parsed = withdrawalSignerBroadcastRequestSchema.parse({
        ...req.body,
        withdrawalId: req.params.withdrawalId
      });
      const { txHash } = await signerService.broadcastWithdrawal({
        toAddress: parsed.toAddress,
        amountSun: BigInt(parsed.amountSun)
      });
      res.json(
        withdrawalSignerBroadcastResponseSchema.parse({
          schemaVersion: WITHDRAW_SIGNER_SCHEMA_VERSION,
          withdrawalId: parsed.withdrawalId,
          txHash,
          signerBackend: 'local',
          broadcastedAt: new Date().toISOString()
        })
      );
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/internal/signer/virtual-wallets/:virtualWalletId/activation-reclaim', requireInternalApiKey, async (req, res) => {
    try {
      const parsed = perWalletActivationReclaimRequestSchema.parse(req.body);
      const virtualWalletId = Array.isArray(req.params.virtualWalletId) ? req.params.virtualWalletId[0] : req.params.virtualWalletId;
      const signer = await perWalletKeyStore.getVirtualWalletSignerById(virtualWalletId);
      if (!signer) {
        res.status(404).json({ error: { code: 'VIRTUAL_WALLET_SIGNER_NOT_FOUND', message: 'virtual wallet signer not found' } });
        return;
      }

      const { txHash } = await signerService.broadcastNative({
        toAddress: parsed.toAddress,
        amountSun: BigInt(parsed.amountSun),
        network: parsed.network ?? signer.network,
        fromAddress: signer.address,
        fromPrivateKey: signer.privateKey
      });
      res.json(buildPerWalletTxResponse(txHash));
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/internal/signer/foxya-wallets/sweep', requireInternalApiKey, async (req, res) => {
    try {
      const parsed = perWalletFoxyaSweepRequestSchema.parse(req.body);
      const signer = await perWalletKeyStore.getFoxyaWalletSignerByAddress({
        address: parsed.sourceAddress,
        currencyId: parsed.currencyId
      });
      if (!signer) {
        res.status(404).json({ error: { code: 'FOXYA_WALLET_SIGNER_NOT_FOUND', message: 'foxya wallet signer not found' } });
        return;
      }

      const { txHash } = await signerService.broadcastTransfer({
        toAddress: parsed.toAddress,
        amountSun: BigInt(parsed.amountSun),
        network: parsed.network,
        fromAddress: signer.address,
        fromPrivateKey: signer.privateKey
      });
      res.json(buildPerWalletTxResponse(txHash));
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/internal/signer/tron/broadcast-transfer', requireInternalApiKey, async (req, res) => {
    try {
      const parsed = tronSignerBroadcastTransferRequestSchema.parse(req.body);
      const { txHash } = await signerService.broadcastTransfer({
        toAddress: parsed.toAddress,
        amountSun: BigInt(parsed.amountSun),
        network: parsed.network,
        apiUrl: parsed.apiUrl,
        contractAddress: parsed.contractAddress,
        fromAddress: parsed.fromAddress
      });
      res.json(buildTronTxResponse(txHash));
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/internal/signer/tron/broadcast-native', requireInternalApiKey, async (req, res) => {
    try {
      const parsed = tronSignerBroadcastNativeRequestSchema.parse(req.body);
      const { txHash } = await signerService.broadcastNative({
        toAddress: parsed.toAddress,
        amountSun: BigInt(parsed.amountSun),
        network: parsed.network,
        apiUrl: parsed.apiUrl,
        fromAddress: parsed.fromAddress
      });
      res.json(buildTronTxResponse(txHash));
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/internal/signer/tron/delegate-resource', requireInternalApiKey, async (req, res) => {
    try {
      const parsed = tronSignerResourceRequestSchema.parse(req.body);
      const { txHash } = await signerService.delegateResource({
        receiverAddress: parsed.receiverAddress,
        amountSun: BigInt(parsed.amountSun),
        resource: parsed.resource,
        network: parsed.network,
        fromAddress: parsed.fromAddress,
        lock: parsed.lock,
        lockPeriod: parsed.lockPeriod
      });
      res.json(buildTronTxResponse(txHash));
    } catch (error) {
      handleError(res, error);
    }
  });

  app.post('/api/internal/signer/tron/undelegate-resource', requireInternalApiKey, async (req, res) => {
    try {
      const parsed = tronSignerResourceRequestSchema.parse(req.body);
      const { txHash } = await signerService.undelegateResource({
        receiverAddress: parsed.receiverAddress,
        amountSun: BigInt(parsed.amountSun),
        resource: parsed.resource,
        network: parsed.network,
        fromAddress: parsed.fromAddress,
        lock: parsed.lock,
        lockPeriod: parsed.lockPeriod
      });
      res.json(buildTronTxResponse(txHash));
    } catch (error) {
      handleError(res, error);
    }
  });

  return app;
};

const buildTronTxResponse = (txHash: string) =>
  tronSignerTxResponseSchema.parse({
    schemaVersion: TRON_SIGNER_SCHEMA_VERSION,
    txHash,
    signerBackend: 'local',
    broadcastedAt: new Date().toISOString()
  });

const buildPerWalletTxResponse = (txHash: string) =>
  perWalletSignerTxResponseSchema.parse({
    schemaVersion: PER_WALLET_SIGNER_SCHEMA_VERSION,
    txHash,
    signerBackend: 'local',
    broadcastedAt: new Date().toISOString()
  });

const handleError = (res: express.Response, error: unknown) => {
  const message = error instanceof Error ? error.message : 'signer request failed';
  const status = /unauthorized/i.test(message) ? 401 : /required|configuration/i.test(message) ? 500 : 400;
  res.status(status).json({
    error: {
      code: 'SIGNER_REQUEST_FAILED',
      message
    }
  });
};
