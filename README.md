# Sui zkLogin demo

![Sui zkLogin demo](./assets/banner.png)

A Sui zkLogin end-to-end implementation and tutorial, including: web front-end + ZK proving service + salt service.

It shows how to use Google/Twitch/Facebook to create a Sui zkLogin address and send a transaction.

The code is meant to be as simple as possible to demonstrate how to put all the pieces together.

Your feedback and pull requests are welcome!

Official docs: https://docs.sui.io/build/zk_login

## OpenID providers

You'll need to create a developer account on Google/Twitch/Facebook. Then, create an "app" from which you can obtain the Client ID to populate your `web/src/config.json`.

Developer consoles: [Google](https://console.cloud.google.com/home/dashboard), [Twitch](https://dev.twitch.tv/console), [Facebook](https://developers.facebook.com/apps/).

Docs: https://docs.sui.io/build/zk_login#configure-a-developer-account-with-openid-provider

## Front-end

### React webapp

A simple React app that lets users create a Sui zkLogin address and send a transaction using various OpenID providers: Google, Twitch, Facebook.

All the relevant code is in [web/src/App.tsx](./web/src/App.tsx)

#### Local development

\- Copy `web/config.example.json` into `web/config.json` and modify it.

\- Run the app locally:
```
cd web/
pnpm install
pnpm serve
```

## Back-end

You'll need to set up a Linux machine somewhere and install Docker in it.

Specs: I used Ubuntu on DigitalOcean, and the cheapest droplet that was powerful enough has 2 CPUs and 2 GB of memory and costs $18/month, but can only generate 1 proof at a time.

### ZK proving service

A service that generates a zero-knowledge proof for each ephemeral key pair.

Docs: https://docs.sui.io/build/zk_login#get-the-zero-knowledge-proof

Here is how to run the service using the Docker images provided by Mysten Labs:

#### 1. Download the `prover` and `prover-fe` Docker images
Check if there are newer images: https://hub.docker.com/r/mysten/zklogin/tags
```
docker pull mysten/zklogin:prover-a66971815c15ba10c699203c5e3826a18eabc4ee
docker pull mysten/zklogin:prover-fe-a66971815c15ba10c699203c5e3826a18eabc4ee
```

#### 2. Download the Groth16 proving .zkey file
```
mkdir -p $HOME/data/ && cd $HOME/data/
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/sui-foundation/zklogin-ceremony-contributions.git
cd zklogin-ceremony-contributions/
git lfs pull --include "zkLogin.zkey"
```
To verify that you downloaded the correct zkey file, run `b2sum zkLogin.zkey` and check that the Blake2b hash is `060beb961802568ac9ac7f14de0fbcd55e373e8f5ec7cc32189e26fb65700aa4e36f5604f868022c765e634d14ea1cd58bd4d79cef8f3cf9693510696bcbcbce`.

#### 3. Run `prover` with the downloaded .zkey
```
docker run -d \
  -e ZKEY=/app/binaries/zkLogin.zkey \
  -e WITNESS_BINARIES=/app/binaries \
  -v $HOME/data/zklogin-ceremony-contributions/zkLogin.zkey:/app/binaries/zkLogin.zkey \
  -p 5000:8080 \
  mysten/zklogin:prover-a66971815c15ba10c699203c5e3826a18eabc4ee
```

#### 4. Run `prover-fe`
```
docker run -d \
  --add-host=host.docker.internal:host-gateway \
  -e PROVER_URI='http://host.docker.internal:5000/input' \
  -e NODE_ENV=production \
  -e DEBUG=zkLogin:info,jwks \
  -p 5001:8080 \
  mysten/zklogin:prover-fe-a66971815c15ba10c699203c5e3826a18eabc4ee
```

Check that it's running correctly (should return `pong`):
```
curl localhost:5001/ping # from the server
curl [EXTERNAL_IP_ADDRESS]:5001/ping # from the outside
```

### Salt service

A salt service returns a unique user salt from a JWT token.

(Alternatively, salts can be managed on the client side.)

Docs: https://docs.sui.io/build/zk_login#user-salt-management

[salt/](./salt/) is a demo salt service (not fit for production) that you can run on your server:

#### 1. Build the Docker image
```
mkdir -p $HOME/data/ && cd $HOME/data/
git clone https://github.com/juzybits/polymedia-zklogin-demo.git
cd polymedia-zklogin-demo/salt/
docker build -t salt-service .
```

#### 2. Run `salt-service`
```
docker run -d -p 5002:5002 salt-service
```

Check that it's running correctly (should return `pong`):
```
curl localhost:5002/ping # from the server
curl [EXTERNAL_IP_ADDRESS]:5002/ping # from the outside
```

### Reverse proxy

To avoid CORS issues when calling the ZK proving and salt services from the webapp,
we set up an Nginx reverse proxy:

#### 1. Install Nginx

```
sudo apt install -y nginx
```

#### 2. Configure Nginx

```
echo 'server {
    listen 80;

    # Add CORS headers
    add_header Access-Control-Allow-Origin *;
    add_header Access-Control-Allow-Methods "GET, POST";
    add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";

    # ZK proving service
    location /prover-fe/ {
        proxy_pass http://localhost:5001/;
    }

    # Salt service
    location /salt/ {
        proxy_pass http://localhost:5002/;
    }
}' | sudo tee /etc/nginx/sites-available/default
```

#### 3. Restart Nginx to apply changes

```
sudo systemctl restart nginx
```

Check that you can reach the prover and salt services through the proxy:
```
curl [EXTERNAL_IP_ADDRESS]/prover-fe/ping
curl [EXTERNAL_IP_ADDRESS]/salt/ping
```

These two URLs correspond with `URL_ZK_PROVER` and `URL_SALT_SERVICE` in your `web/src/config.json`.

## Common issues

If you get this error when requesting a ZK proof from your server, you'll need to upgrade to a faster server so the request can complete within 15 seconds.
```
{
  name: 'Error',
  message: 'Call to rapidsnark service took longer than 15s'
}
```

## Additional resources

### Docs

Official Docs<br/>
https://docs.sui.io/build/zk_login

Google OAuth 2.0 for Client-side Web Applications<br/>
https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow

### Videos

A Complete Guide to zkLogin: How it Works and How to Integrate | Joy Wang<br/>
https://www.youtube.com/watch?v=Jk4mq5IOUYc

### Articles

zkLogin Best Practices and Business Considerations for Builders<br/>
https://blog.sui.io/zklogin-best-practices-considerations/

zkLogin Demystified: Exploring Sui's Cutting-Edge Authentication<br/>
https://blog.sui.io/zklogin-deep-dive/

### Other

zkLogin Audit<br/>
https://github.com/sui-foundation/security-audits/blob/main/zksecurity_zklogin-circuits.pdf

### Code

sui-wallet | @MystenLabs<br/>
https://github.com/MystenLabs/sui/blob/main/apps/wallet/src/background/accounts/zklogin/

chrome-extension | @EthosWallet<br/>
https://github.com/EthosWallet/chrome-extension/tree/main/src/ui/app/components/zklogin/

sui-zk-wallet | @ronanyeah<br/>
https://github.com/ronanyeah/sui-zk-wallet

zklogin-demo | @Scale3-Labs<br/>
https://github.com/Scale3-Labs/zklogin-demo

suidouble-zklogin | @suidouble<br/>
https://github.com/suidouble/suidouble-zklogin
