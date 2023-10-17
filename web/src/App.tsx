import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { SerializedSignature } from '@mysten/sui.js/cryptography';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import { TransactionBlock } from '@mysten/sui.js/transactions';
import {
    genAddressSeed,
    generateNonce,
    generateRandomness,
    getZkLoginSignature,
    jwtToAddress,
} from '@mysten/zklogin';
import { toBigIntBE } from 'bigint-buffer';
import { decodeJwt } from 'jose';
import { useEffect, useState } from 'react';
import './App.less';

/* Configuration (edit these constants) */
const URL_ZK_PROVER = 'http://137.184.238.177/v1';
const CLIENT_ID_GOOGLE = '139697148457-3s1nc6h8an06f84do363lbc6j61i0vfo.apps.googleusercontent.com';
const MAX_EPOCH = 2; // keep ephemeral keys active for this many Sui epochs from now (1 epoch ~= 24h)

const suiClient = new SuiClient({
    url: getFullnodeUrl('devnet'), // TODO: support network choice
});

export const App: React.FC = () =>
{
    const [accounts, _setAccounts] = useState<AccountData[]>(loadAccounts());

    useEffect(() => {
        completeZkLogin();
    }, []);

    return (
        <div>
            <button onClick={beginZkLogin}>Google login</button>
            <div id='accounts'>
                <h2>Accounts:</h2>
                {accounts.map(account =>
                    <div className='account' key={account.userAddr}>
                        <button onClick={() => submitTransaction(account)}>
                            Send transaction with {account.userAddr}
                        </button>
                        <pre>{JSON.stringify(account, null, 2)}</pre>
                        <hr/>
                    </div>
                )}
            </div>
        </div>
    );
}

async function beginZkLogin() {
    // Create a nonce
    // https://docs.sui.io/build/zk_login#set-up-oauth-flow
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + MAX_EPOCH; // the ephemeral key will be valid for MAX_EPOCH from now
    const randomness = generateRandomness();
    const ephemeralKeyPair = new Ed25519Keypair();
    const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);

    // Save data to local storage so completeZkLogin() can use it after the redirect
    saveSetupData({
        maxEpoch,
        randomness: randomness.toString(),
        ephemeralPublicKey: toBigIntBE(Buffer.from(ephemeralKeyPair.getPublicKey().toSuiBytes())).toString(),
        ephemeralPrivateKey: ephemeralKeyPair.export().privateKey,
    });

    // Start the OAuth flow with the OpenID provider
    // https://docs.sui.io/build/zk_login#configure-a-developer-account-with-openid-provider
    const urlParams = new URLSearchParams({
        client_id: CLIENT_ID_GOOGLE,
        nonce: nonce,
        redirect_uri: window.location.origin,
        response_type: 'id_token',
        scope: 'openid',
    });
    const loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${urlParams}`;
    window.location.replace(loginUrl);
}

async function completeZkLogin() {
    // Validate the JWT
    const urlFragment = window.location.hash.substring(1);
    const urlParams = new URLSearchParams(urlFragment);
    const jwt = urlParams.get('id_token');
    console.debug('jwt:', jwt);
    if (!jwt) {
        return;
    }
    const jwtPayload = decodeJwt(jwt);
    if (!jwtPayload.sub || !jwtPayload.aud) {
        console.warn('[completeZkLogin] missing jwt.sub or jwt.aud');
        return;
    }

    // Get a Sui address for the user
    // https://docs.sui.io/build/zk_login#get-the-users-sui-address
    const userSalt = BigInt('129390038577185583942388216820280642146'); // TODO
    const userAddr = jwtToAddress(jwt, userSalt);
    console.debug('userSalt:', userSalt.toString());
    console.debug('userAddr:', userAddr);

    // Load and clear data from local storage which beginZkLogin() created before the redirect
    const setupData = loadSetupData();
    if (!setupData) {
        console.warn('[completeZkLogin] missing local storage data');
        return;
    }
    clearSetupData();

    // Get the zero-knowledge proof
    // https://docs.sui.io/build/zk_login#get-the-zero-knowledge-proof
    const zkProofs = await fetch(URL_ZK_PROVER, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            maxEpoch: setupData.maxEpoch,
            jwtRandomness: setupData.randomness,
            extendedEphemeralPublicKey: setupData.ephemeralPublicKey,
            jwt,
            salt: userSalt.toString(),
            keyClaimName: 'sub',
        }),
    })
    .then(res => {
        console.log('zkProofResponse:', res);
        return res.json();
    })
    .catch(error => {
        console.warn('[completeZkLogin] failed to get ZK proof:', error);
        return null;
    });

    if (!zkProofs) {
        return;
    }

    // Save data to local storage so submitTransaction() can use it
    saveAccount({
        userAddr,
        zkProofs,
        ephemeralPublicKey: setupData.ephemeralPublicKey,
        ephemeralPrivateKey: setupData.ephemeralPrivateKey,
        userSalt: userSalt.toString(),
        sub: jwtPayload.sub,
        aud: typeof jwtPayload.aud === 'string' ? jwtPayload.aud : jwtPayload.aud[0],
        maxEpoch: setupData.maxEpoch,
    });
}

// Assemble the zkLogin signature and submit the transaction
// https://docs.sui.io/build/zk_login#assemble-the-zklogin-signature-and-submit-the-transaction
async function submitTransaction(account: AccountData) {
    // Sign the transaction bytes with the ephemeral private key.
    const txb = new TransactionBlock();
    txb.setSender(account.userAddr);
    const ephemeralKeyPair = Ed25519Keypair.fromSecretKey(
        Buffer.from(account.ephemeralPrivateKey, 'base64')
    );
    const { bytes, signature: userSignature } = await txb.sign({
        client: suiClient,
        signer: ephemeralKeyPair,
    });

    // Generate an address seed by combining userSalt, sub (subject ID), and aud (audience).
    const addressSeed = genAddressSeed(
        BigInt(account.userSalt),
        'sub',
        account.sub,
        account.aud,
    ).toString();

    // Serialize the zkLogin signature by combining the ZK proof (inputs), the maxEpoch,
    // and the ephemeral signature (userSignature).
    const zkLoginSignature : SerializedSignature = getZkLoginSignature({
        inputs: {
            ...account.zkProofs,
            addressSeed,
        },
        maxEpoch: account.maxEpoch,
        userSignature,
    });

    // Execute the transaction
    const result = await suiClient.executeTransactionBlock({
        transactionBlock: bytes,
        signature: zkLoginSignature,
    });
    console.debug(result);
}

/* Local storage helpers */

const setupDataKey = 'polymedia.zklogin';

type SetupData = {
    maxEpoch: number;
    randomness: string;
    ephemeralPublicKey: string,
    ephemeralPrivateKey: string,
}

function saveSetupData(data: SetupData) {
    localStorage.setItem(setupDataKey, JSON.stringify(data))
}

function loadSetupData(): SetupData|null {
    const dataRaw = localStorage.getItem(setupDataKey);
    if (!dataRaw) {
        return null;
    }
    const data: SetupData = JSON.parse(dataRaw);
    return data;
}

function clearSetupData(): void {
    localStorage.removeItem(setupDataKey);
}

const accountDataKey = 'polymedia.accounts';

type AccountData = {
    userAddr: string,
    zkProofs: any, // TODO: add type
    ephemeralPublicKey: string,
    ephemeralPrivateKey: string,
    userSalt: string,
    sub: string,
    aud: string,
    maxEpoch: number,
}

function saveAccount(data: AccountData): void {
    const accounts = loadAccounts();
    accounts.push(data);
    localStorage.setItem(accountDataKey, JSON.stringify(accounts));
}

function loadAccounts(): AccountData[] {
    const dataRaw = localStorage.getItem(accountDataKey);
    if (!dataRaw) {
        return [];
    }
    const data: AccountData[] = JSON.parse(dataRaw);
    return data;
}
