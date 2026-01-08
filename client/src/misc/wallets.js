/* Copyright (c) 2025 XBID LABS LLC
 *
 * This file is part of XBID-AI project.
 * Licensed under the MIT License.
 * Author: Fred Kyung-jin Rezeau (오경진 吳景振) <hello@kyungj.in>
 */

import { StellarWalletsKit, WalletNetwork, allowAllModules, FREIGHTER_ID } from '@creit.tech/stellar-wallets-kit';
import { WalletConnectAllowedMethods, WalletConnectModule, WALLET_CONNECT_ID } from '@creit.tech/stellar-wallets-kit/modules/walletconnect.module';
import { LedgerModule, LEDGER_ID } from '@creit.tech/stellar-wallets-kit/modules/ledger.module';
import { Horizon, StrKey, TransactionBuilder, Networks } from '@stellar/stellar-sdk';

const horizonClient = new Horizon.Server('https://horizon.stellar.org', { allowHttp: true });

const walletConnect = new WalletConnectModule({
    url: 'https://xbid.ai',
    projectId: '9eae7d526a7fb70295bc145af51bc8b6',
    method: WalletConnectAllowedMethods.SIGN,
    description: 'intelligence. staked. onchain.',
    name: 'xbid.ai',
    icons: ['https://xbid.ai/icon-512.png'],
    network: WalletNetwork.PUBLIC
});

const stellarWalletsKit = new StellarWalletsKit({
    network: WalletNetwork.PUBLIC,
    selectedWalletId: FREIGHTER_ID,
    modules: [...allowAllModules(), walletConnect, new LedgerModule()]
});

export class Wallets {
    static get kit() {
        return stellarWalletsKit;
    }

    static get walletConnectId() {
        return WALLET_CONNECT_ID;
    }

    static get ledgerId() {
        return LEDGER_ID;
    }

    static get horizonClient() {
        return horizonClient;
    }

    static async getAddress() {
        return new Promise((resolve, reject) => {
            this.kit.openModal({
                onWalletSelected: async(option) => {
                    try {
                        this.kit.setWallet(option.id);
                        const { address } = await this.kit.getAddress();
                        if (StrKey.isValidEd25519PublicKey(address)) {
                            resolve({ address });
                        } else {
                            throw new Error('Invalid address');
                        }
                    } catch (err) {
                        console.error(err);
                        reject(err);
                    }
                },
                onClosed: (err) => {
                    reject(err);
                }
            });
        });
    }

    static async requestSignature(xdr) {
        try {
            const { address } = await this.getAddress();
            const txXdr = await xdr(address);
            const { signedTxXdr } = await this.kit.signTransaction(txXdr, {
                address,
                networkPassphrase: Networks.PUBLIC
            });
            return { xdr: signedTxXdr, address };
        } catch (err) {
            throw new Error(err?.response?.data?.extras?.result_codes
                ? JSON.stringify(err.response.data.extras.result_codes)
                : err?.message ?? err);
        }
    }

    static async submitTransaction(xdr) {
        try {
            const result = await horizonClient.submitTransaction(TransactionBuilder.fromXDR(xdr, Networks.PUBLIC));
            return { hash: result._links.transaction.href.replace('https://horizon.stellar.org/transactions/', '') };
        } catch (err) {
            throw new Error(err?.response?.data?.extras?.result_codes
                ? JSON.stringify(err.response.data.extras.result_codes)
                : err?.message ?? err);
        }
    }
}

Object.freeze(Wallets);
