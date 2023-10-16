import { useEffect } from 'react';

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import {
    generateNonce,
    generateRandomness,
    jwtToAddress,
} from '@mysten/zklogin';
import { toBigIntBE } from 'bigint-buffer';

import './App.less';

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

type LocalStorageZkLoginData = {
    maxEpoch: number;
    randomness: string;
    ephemeralPublicKey: string;
}

async function beginZkLogin() {
    // Create a nonce
    // https://docs.sui.io/build/zk_login#set-up-oauth-flow
    const suiClient = new SuiClient({
        url: getFullnodeUrl('devnet'), // TODO: support user choice
    });
    const { epoch } = await suiClient.getLatestSuiSystemState();
    const maxEpoch = Number(epoch) + 2; // the ephemeral key will be active for 2 epochs from now
    const ephemeralKeyPair = new Ed25519Keypair();
    const ephemeralPublicKey = toBigIntBE(Buffer.from(ephemeralKeyPair.getPublicKey().toSuiBytes())).toString()
    const randomness = generateRandomness();
    const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);
    console.debug('maxEpoch:', maxEpoch);
    console.debug('randomness:', randomness.toString());
    console.debug('ephemeralPublicKey:', ephemeralPublicKey);

    // Set local storage so completeZkLogin() can use it after the page reload
    const data: LocalStorageZkLoginData =  {
        maxEpoch,
        randomness: randomness.toString(),
        ephemeralPublicKey
    };
    localStorage.setItem('polymedia.zklogin', JSON.stringify(data))

    // Start OAuth flow with the OpenID provider
    // https://docs.sui.io/build/zk_login#configure-a-developer-account-with-openid-provider
    const urlParams = new URLSearchParams({
        client_id: '139697148457-3s1nc6h8an06f84do363lbc6j61i0vfo.apps.googleusercontent.com',
        nonce: nonce,
        redirect_uri: 'http://localhost:1234',
        response_type: 'id_token',
        scope: 'openid',
    });
    const loginUrl = `https://accounts.google.com/o/oauth2/v2/auth?${urlParams}`;
    window.location.replace(loginUrl);
}

async function completeZkLogin() {
    // Get the user's Sui address
    // https://docs.sui.io/build/zk_login#get-the-users-sui-address
    const urlFragment = window.location.hash.substring(1);
    const urlParams = new URLSearchParams(urlFragment);
    const jwt = urlParams.get('id_token');
    console.debug('jwt:', jwt);
    if (!jwt) {
        return;
    }
    const userSalt = BigInt('129390038577185583942388216820280642146'); // TODO
    console.debug('userSalt:', userSalt.toString());
    const userAddr = jwtToAddress(jwt, userSalt);
    console.debug('userAddr:', userAddr);

    // Get the zero-knowledge proof
    // https://docs.sui.io/build/zk_login#get-the-zero-knowledge-proof
    const dataRaw = localStorage.getItem('polymedia.zklogin');
    if (!dataRaw) {
        console.warn('[completeZkLogin] missing local storage data');
        return;
    }
    const data: LocalStorageZkLoginData = JSON.parse(dataRaw);
    const zkProofRequestParams =  {
        maxEpoch: data.maxEpoch,
        extendedEphemeralPublicKey: data.ephemeralPublicKey,
        jwtRandomness: data.randomness,
        jwt,
        salt: userSalt.toString(),
        keyClaimName: 'sub',
    };
    const zkProofResponse = await fetch(proxy('http://137.184.238.177:5001/v1'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(zkProofRequestParams),
    });
    console.log('zkProofResponse:', zkProofResponse);
}

const proxy = (url: string) => 'https://cors-proxy.fringe.zone/' + url;
