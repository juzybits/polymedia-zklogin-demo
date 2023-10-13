import { useEffect } from 'react';

import { SuiClient, getFullnodeUrl } from '@mysten/sui.js/client';
import { Ed25519Keypair } from '@mysten/sui.js/keypairs/ed25519';
import {
    generateNonce,
    generateRandomness,
    jwtToAddress,
} from '@mysten/zklogin';

import './App.less';

export const App: React.FC = () =>
{
    useEffect(() => {
        processJwt();
    }, []);

    return (
        <div>
            <button onClick={googleLogin}>Google login</button>
        </div>
    );
}

function processJwt() {
    const urlFragment = window.location.hash.substring(1);
    const urlParams = new URLSearchParams(urlFragment);
    const jwt = urlParams.get('id_token');
    console.debug('jwt:', jwt);
    if (!jwt) {
        return;
    }
    const userSalt = BigInt('129390038577185583942388216820280642146'); // TODO
    const userAddr = jwtToAddress(jwt, userSalt);
    console.debug('userAddr:', userAddr);
}

// https://docs.sui.io/build/zk_login#set-up-oauth-flow
async function getNonce() {
    const suiClient = new SuiClient({
        url: getFullnodeUrl('devnet'), // TODO: support user choice
    });
    const { epoch } = await suiClient.getLatestSuiSystemState();

    const maxEpoch = Number(epoch) + 2; // the ephemeral key will be active for 2 epochs from now
    const ephemeralKeyPair = new Ed25519Keypair();
    const randomness = generateRandomness();
    const nonce = generateNonce(ephemeralKeyPair.getPublicKey(), maxEpoch, randomness);
    // console.debug('randomness:', randomness);
    // console.debug('nonce:', nonce);
    return nonce;
}

// https://docs.sui.io/build/zk_login#configure-a-developer-account-with-openid-provider
async function googleLogin() {
    const nonce = await getNonce();

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
