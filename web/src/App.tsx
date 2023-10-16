import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import {
    generateNonce,
    generateRandomness,
    jwtToAddress,
} from '@mysten/zklogin';
import { toBigIntBE } from 'bigint-buffer';
import { useEffect } from 'react';
import './App.less';

/* Configuration (edit this section) */
const NETWORK_NAME = 'devnet'; // TODO: support user choice
const URL_ZK_PROVER = 'http://137.184.238.177:5001/v1';
const CLIENT_ID_GOOGLE = '139697148457-3s1nc6h8an06f84do363lbc6j61i0vfo.apps.googleusercontent.com';
const MAX_EPOCH = 2; // keep ephemeral keys active for this many Sui epochs from now (1 epoch ~= 24h)

export const App: React.FC = () =>
{
    useEffect(() => {
        completeZkLogin();
    }, []);

    return (
        <div>
            <button onClick={beginZkLogin}>Google login</button>
        </div>
    );
}

async function beginZkLogin() {
    // Create a nonce
    // https://docs.sui.io/build/zk_login#set-up-oauth-flow
    const suiClient = new SuiClient({
        url: getFullnodeUrl(NETWORK_NAME),
    });
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + MAX_EPOCH; // the ephemeral key will be valid for MAX_EPOCH from now
    const randomness = generateRandomness();
    const ephemeralKeyPair = new Ed25519Keypair();
    const ephemeralPublicKey = toBigIntBE(Buffer.from(ephemeralKeyPair.getPublicKey().toSuiBytes())).toString()
    const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);

    // Save data to local storage so completeZkLogin() can use it after the redirect
    saveBeginZkLoginData({
        maxEpoch,
        randomness: randomness.toString(),
        ephemeralPublicKey,
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
    // Get a Sui address for the user
    // https://docs.sui.io/build/zk_login#get-the-users-sui-address
    const urlFragment = window.location.hash.substring(1);
    const urlParams = new URLSearchParams(urlFragment);
    const jwt = urlParams.get('id_token');
    console.debug('jwt:', jwt);
    if (!jwt) {
        return;
    }
    const userSalt = BigInt('129390038577185583942388216820280642146'); // TODO
    const userAddr = jwtToAddress(jwt, userSalt);
    console.debug('userSalt:', userSalt.toString());
    console.debug('userAddr:', userAddr);

    // Load data from local storage which beginZkLogin() created before the redirect
    const zkLoginData = loadBeginZkLoginData();
    if (!zkLoginData) {
        console.warn('[completeZkLogin] missing local storage data');
        return;
    }
    clearBeginZkLoginData();

    // Get the zero-knowledge proof
    // https://docs.sui.io/build/zk_login#get-the-zero-knowledge-proof
    const zkProofRequestParams =  {
        maxEpoch: zkLoginData.maxEpoch,
        jwtRandomness: zkLoginData.randomness,
        extendedEphemeralPublicKey: zkLoginData.ephemeralPublicKey,
        jwt,
        salt: userSalt.toString(),
        keyClaimName: 'sub',
    };
    const zkProofResponse = await fetch(proxy(URL_ZK_PROVER), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zkProofRequestParams),
    });
    console.log('zkProofResponse:', zkProofResponse);
}

const proxy = (url: string) => 'https://cors-proxy.fringe.zone/' + url;

/* State management via local storage */

type BeginZkLoginData = {
    maxEpoch: number;
    randomness: string;
    ephemeralPublicKey: string;
}

const beginZkLoginKey = 'polymedia.zklogin';

function saveBeginZkLoginData(data: BeginZkLoginData) {
    localStorage.setItem(beginZkLoginKey, JSON.stringify(data))
}

function loadBeginZkLoginData(): BeginZkLoginData|null {
    const dataRaw = localStorage.getItem(beginZkLoginKey);
    if (!dataRaw) {
        return null;
    }
    const data: BeginZkLoginData = JSON.parse(dataRaw);
    return data;
}

function clearBeginZkLoginData(): void {
    localStorage.removeItem(beginZkLoginKey);
}
