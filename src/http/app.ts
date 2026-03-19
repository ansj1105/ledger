import express from 'express';
import {
  withdrawalSignerBroadcastRequestSchema,
  withdrawalSignerBroadcastResponseSchema,
  WITHDRAW_SIGNER_SCHEMA_VERSION
} from '../contracts/withdraw-signer-contracts.js';
import {
  tronSignerBroadcastNativeRequestSchema,
  tronSignerBroadcastTransferRequestSchema,
  tronSignerResourceRequestSchema,
  tronSignerTxResponseSchema,
  TRON_SIGNER_SCHEMA_VERSION
} from '../contracts/tron-signer-contracts.js';
import { env } from '../config/env.js';
import { requireInternalApiKey } from '../utils/auth.js';
import { TronSignerService } from '../tron/tron-signer-service.js';

export const createApp = () => {
  const app = express();
  const signerService = new TronSignerService();

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

const handleError = (res: express.Response, error: unknown) => {
  const status = error instanceof Error && /unauthorized/i.test(error.message) ? 401 : 400;
  res.status(status).json({
    error: {
      code: 'SIGNER_REQUEST_FAILED',
      message: error instanceof Error ? error.message : 'signer request failed'
    }
  });
};
