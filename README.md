# Sui zkLogin demo

An end-to-end Sui zkLogin example: web front-end + ZK proving service + salt service.

Official docs: https://docs.sui.io/build/zk_login

## Webapp

The webapp lets users create a Sui zkLogin address and send a devnet transaction with various OpenID providers: Google, Twitch, Facebook.

### Local development

- Create a Google/Twitch/Facebook app: https://docs.sui.io/build/zk_login#configure-a-developer-account-with-openid-provider
- Copy `web/config.example.json` into `web/config.json` and modify it.
- Run the app locally:
```
cd web/
pnpm install
pnpm serve
```

## ZK proving service

A back-end service is required to generate a zero-knowledge proof for each ephemeral key pair.

To learn more about the steps below, check the official docs: https://docs.sui.io/build/zk_login#run-the-proving-service-in-your-backend

### 0. Prerequisites
\- Set up a Linux server somewhere.

\- Install Docker on it: https://docs.docker.com/engine/install/

### 1. Download the `prover` and `prover-fe` Docker images
Check if there are newer images: https://hub.docker.com/r/mysten/zklogin/tags
```
docker pull mysten/zklogin:prover-a66971815c15ba10c699203c5e3826a18eabc4ee
docker pull mysten/zklogin:prover-fe-a66971815c15ba10c699203c5e3826a18eabc4ee
```

### 2. Download the Groth16 proving .zkey file
```
mkdir -p $HOME/data/
cd $HOME/data/
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/sui-foundation/zklogin-ceremony-contributions.git
cd zklogin-ceremony-contributions/
git lfs pull --include "zkLogin.zkey"
```
To verify that you downloaded the correct zkey file, run `b2sum zkLogin.zkey` and check that the Blake2b hash is `060beb961802568ac9ac7f14de0fbcd55e373e8f5ec7cc32189e26fb65700aa4e36f5604f868022c765e634d14ea1cd58bd4d79cef8f3cf9693510696bcbcbce`.

### 3. Run `prover` with the downloaded zkey
```
docker run -d \
  -e ZKEY=/app/binaries/zkLogin.zkey \
  -e WITNESS_BINARIES=/app/binaries \
  -v $HOME/data/zklogin-ceremony-contributions/zkLogin.zkey:/app/binaries/zkLogin.zkey \
  -p 5000:8080 \
  mysten/zklogin:prover-a66971815c15ba10c699203c5e3826a18eabc4ee
```

### 4. Run `prover-fe`
```
docker run -d \
  --add-host=host.docker.internal:host-gateway \
  -e PROVER_URI='http://host.docker.internal:5000/input' \
  -e NODE_ENV=production \
  -e DEBUG=zkLogin:info,jwks \
  -p 5001:8080 \
  mysten/zklogin:prover-fe-a66971815c15ba10c699203c5e3826a18eabc4ee
```
Check if it's running (should return "pong"):
```
curl http://localhost:5001/ping # from your server
curl [EXTERNAL_IP_ADDRESS]:5001/ping # from the outside
```

### 5. Salt service

A demo salt service (not fit for production) that you can run on your Linux server.

#### Build the Docker image
```
git clone https://github.com/juzybits/polymedia-zklogin-demo.git
cd polymedia-zklogin-demo/salt/
docker build -t salt-service .
```

#### Run the `salt-service`
```
docker run -d -p 5002:5002 salt-service
```

### 6. Reverse proxy

To avoid CORS issues when calling the ZK proving service and the salt service from the webapp,
we set up an Nginx reverse proxy.

```
# Install Nginx
sudo apt update && sudo apt install -y nginx

# Set up the new configuration
echo 'server {
    listen 80;

    location /prover-fe/ {
        proxy_pass http://localhost:5001/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Add CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
        add_header Access-Control-Expose-Headers "Content-Length,Content-Range";
    }

    location /salt/ {
        proxy_pass http://localhost:5002/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        # Add CORS headers
        add_header Access-Control-Allow-Origin *;
        add_header Access-Control-Allow-Methods "GET, POST, OPTIONS";
        add_header Access-Control-Allow-Headers "DNT,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type,Range";
        add_header Access-Control-Expose-Headers "Content-Length,Content-Range";
    }
}' | sudo tee /etc/nginx/sites-available/default

# Restart Nginx to apply changes
sudo systemctl restart nginx
```

## Resources

### Reference

Official Docs
https://docs.sui.io/build/zk_login

Google: OAuth 2.0 for Client-side Web Applications
https://developers.google.com/identity/protocols/oauth2/javascript-implicit-flow

### Video

A Complete Guide to zkLogin: How it Works and How to Integrate | Joy Wang
https://www.youtube.com/watch?v=Jk4mq5IOUYc

### Code

sui-wallet | @MystenLabs
https://github.com/MystenLabs/sui/blob/main/apps/wallet/src/background/accounts/zklogin/ZkLoginAccount.ts
https://github.com/MystenLabs/sui/blob/main/apps/wallet/src/background/accounts/zklogin/utils.ts

sui-zk-wallet | @ronanyeah
https://github.com/ronanyeah/sui-zk-wallet

zklogin-demo | @Scale3-Labs
https://github.com/Scale3-Labs/zklogin-demo

### Articles

zkLogin Best Practices and Business Considerations for Builders
https://blog.sui.io/zklogin-best-practices-considerations/

zkLogin Demystified: Exploring Sui's Cutting-Edge Authentication
https://blog.sui.io/zklogin-deep-dive/

### Other
zkLogin Audit
https://github.com/sui-foundation/security-audits/blob/main/zksecurity_zklogin-circuits.pdf
