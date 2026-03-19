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

type Network = 'mainnet' | 'testnet';

type SignerMaterial = {
  fromAddress?: string;
  fromPrivateKey?: string;
};

export class TronSignerService {
  async broadcastWithdrawal(input: { toAddress: string; amountSun: bigint }) {
    return this.broadcastTransfer({ toAddress: input.toAddress, amountSun: input.amountSun });
  }

  async broadcastTransfer(input: {
    toAddress: string;
    amountSun: bigint;
    network?: Network;
    apiUrl?: string;
    contractAddress?: string;
    fromAddress?: string;
    fromPrivateKey?: string;
  }) {
    const { fromAddress, privateKey } = this.resolveSigner(input);
    const tronWeb = this.createTronWeb(input.apiUrl ?? this.resolveApiUrl(input.network), privateKey, fromAddress);
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
    network?: Network;
    apiUrl?: string;
    fromAddress?: string;
    fromPrivateKey?: string;
  }) {
    const { fromAddress, privateKey } = this.resolveSigner(input);
    const tronWeb = this.createTronWeb(input.apiUrl ?? this.resolveApiUrl(input.network), privateKey, fromAddress);
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
    network?: Network;
    fromAddress?: string;
    fromPrivateKey?: string;
    lock?: boolean;
    lockPeriod?: number;
  }) {
    return this.broadcastResourceDelegation('delegate', input);
  }

  async undelegateResource(input: {
    receiverAddress: string;
    amountSun: bigint;
    resource: 'BANDWIDTH' | 'ENERGY';
    network?: Network;
    fromAddress?: string;
    fromPrivateKey?: string;
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
      network?: Network;
      fromAddress?: string;
      fromPrivateKey?: string;
      lock?: boolean;
      lockPeriod?: number;
    }
  ) {
    const { fromAddress, privateKey } = this.resolveSigner(input);
    const tronWeb = this.createTronWeb(this.resolveApiUrl(input.network), privateKey, fromAddress);
    const tx =
      mode === 'delegate'
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

  private resolveSigner(input: SignerMaterial) {
    const privateKey = input.fromPrivateKey ?? env.hotWalletPrivateKey;
    const fromAddress = input.fromAddress ?? env.hotWalletAddress;
    const derivedAddress = TronWeb.address.fromPrivateKey(privateKey);
    if (!derivedAddress || derivedAddress !== fromAddress) {
      throw new Error('signer private key does not match source address');
    }

    return { fromAddress, privateKey };
  }

  private createTronWeb(apiUrl: string, privateKey: string, fromAddress?: string) {
    const tronWeb = new TronWeb({
      fullHost: apiUrl,
      headers: env.tronApiKey ? { 'TRON-PRO-API-KEY': env.tronApiKey } : undefined,
      privateKey
    });
    if (fromAddress) {
      tronWeb.setAddress(fromAddress);
    }
    return tronWeb;
  }

  private resolveApiUrl(network?: Network) {
    if (network === 'testnet') {
      return env.testnetTronApiUrl;
    }
    if (network === 'mainnet') {
      return env.mainnetTronApiUrl;
    }
    return env.tronApiUrl;
  }

  private resolveContractAddress(network?: Network) {
    if (network === 'testnet') {
      return env.testnetKoriTokenContractAddress;
    }
    if (network === 'mainnet') {
      return env.mainnetKoriTokenContractAddress;
    }
    return env.koriTokenContractAddress ?? env.mainnetKoriTokenContractAddress;
  }
}
