import { TronWeb } from 'tronweb';
import { env } from '../config/env.js';

const TRC20_ABI = [
  {
    name: 'transfer',
    type: 'function',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'value', type: 'uint256' }
    ],
    outputs: [{ name: '', type: 'bool' }]
  }
] as const;

export class TronSignerService {
  async broadcastWithdrawal(input: { toAddress: string; amountSun: bigint }) {
    return this.broadcastTransfer({ toAddress: input.toAddress, amountSun: input.amountSun });
  }

  async broadcastTransfer(input: {
    toAddress: string;
    amountSun: bigint;
    network?: 'mainnet' | 'testnet';
    apiUrl?: string;
    contractAddress?: string;
    fromAddress?: string;
  }) {
    const privateKey = env.hotWalletPrivateKey;
    const fromAddress = input.fromAddress ?? env.hotWalletAddress;
    const tronWeb = this.createTronWeb(input.apiUrl ?? this.resolveApiUrl(input.network), privateKey);
    const contractAddress = input.contractAddress ?? this.resolveContractAddress(input.network);
    const contract = await tronWeb.contract(TRC20_ABI, contractAddress).at(contractAddress);
    const txHash = await contract.transfer(input.toAddress, input.amountSun.toString()).send({
      feeLimit: env.tronFeeLimitSun,
      shouldPollResponse: false
    });
    return { txHash: String(txHash) };
  }

  async broadcastNative(input: {
    toAddress: string;
    amountSun: bigint;
    network?: 'mainnet' | 'testnet';
    apiUrl?: string;
    fromAddress?: string;
  }) {
    const privateKey = env.hotWalletPrivateKey;
    const fromAddress = input.fromAddress ?? env.hotWalletAddress;
    const tronWeb = this.createTronWeb(input.apiUrl ?? this.resolveApiUrl(input.network), privateKey);
    const tx = await tronWeb.transactionBuilder.sendTrx(input.toAddress, Number(input.amountSun), fromAddress);
    const signed = await tronWeb.trx.sign(tx, privateKey);
    const broadcast = await tronWeb.trx.sendRawTransaction(signed);
    if (!broadcast.result || !broadcast.txid) {
      throw new Error(broadcast.code ? String(broadcast.code) : 'native transfer broadcast failed');
    }
    return { txHash: broadcast.txid };
  }

  async delegateResource(input: {
    receiverAddress: string;
    amountSun: bigint;
    resource: 'BANDWIDTH' | 'ENERGY';
    network?: 'mainnet' | 'testnet';
    fromAddress?: string;
    lock?: boolean;
    lockPeriod?: number;
  }) {
    return this.broadcastResourceDelegation('delegate', input);
  }

  async undelegateResource(input: {
    receiverAddress: string;
    amountSun: bigint;
    resource: 'BANDWIDTH' | 'ENERGY';
    network?: 'mainnet' | 'testnet';
    fromAddress?: string;
    lock?: boolean;
    lockPeriod?: number;
  }) {
    return this.broadcastResourceDelegation('undelegate', input);
  }

  private async broadcastResourceDelegation(
    mode: 'delegate' | 'undelegate',
    input: {
      receiverAddress: string;
      amountSun: bigint;
      resource: 'BANDWIDTH' | 'ENERGY';
      network?: 'mainnet' | 'testnet';
      fromAddress?: string;
      lock?: boolean;
      lockPeriod?: number;
    }
  ) {
    const privateKey = env.hotWalletPrivateKey;
    const fromAddress = input.fromAddress ?? env.hotWalletAddress;
    const tronWeb = this.createTronWeb(this.resolveApiUrl(input.network), privateKey);
    const tx = mode === 'delegate'
      ? await tronWeb.transactionBuilder.delegateResource(
          Number(input.amountSun),
          input.receiverAddress,
          input.resource,
          fromAddress,
          Boolean(input.lock),
          input.lockPeriod ?? 0
        )
      : await tronWeb.transactionBuilder.undelegateResource(
          Number(input.amountSun),
          input.receiverAddress,
          input.resource,
          fromAddress
        );
    const signed = await tronWeb.trx.sign(tx, privateKey);
    const broadcast = await tronWeb.trx.sendRawTransaction(signed);
    if (!broadcast.result || !broadcast.txid) {
      throw new Error(broadcast.code ? String(broadcast.code) : `${mode} resource broadcast failed`);
    }
    return { txHash: broadcast.txid };
  }

  private createTronWeb(apiUrl: string, privateKey: string) {
    return new TronWeb({
      fullHost: apiUrl,
      headers: env.tronApiKey ? { 'TRON-PRO-API-KEY': env.tronApiKey } : undefined,
      privateKey
    });
  }

  private resolveApiUrl(network?: 'mainnet' | 'testnet') {
    if (network === 'testnet') {
      return env.testnetTronApiUrl;
    }
    if (network === 'mainnet') {
      return env.mainnetTronApiUrl;
    }
    return env.tronApiUrl;
  }

  private resolveContractAddress(network?: 'mainnet' | 'testnet') {
    if (network === 'testnet') {
      return env.testnetKoriTokenContractAddress;
    }
    if (network === 'mainnet') {
      return env.mainnetKoriTokenContractAddress;
    }
    return env.koriTokenContractAddress ?? env.mainnetKoriTokenContractAddress;
  }
}
