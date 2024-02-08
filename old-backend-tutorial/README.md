# Old back-end tutorial

When I first built this demo app, Mysten Labs didn't offer a devnet proving service. So I wrote
this guide to help people set up their own prover. It also shows how to set up a dummy salt service. Doing this is no longer needed to run the app, so the tutorial is not being maintained.

# Setting up your back-end

You'll need to set up a Linux machine somewhere and install Docker in it.

Specs: I used Ubuntu on DigitalOcean, and from my experience I recommend a droplet with at least 4 GB of memory.

## ZK proving service

A service that generates a zero-knowledge proof for each ephemeral key pair.

Docs: https://docs.sui.io/concepts/cryptography/zklogin#get-the-zero-knowledge-proof

Here is how to run the service using the Docker images provided by Mysten Labs:

### 1. Download the `prover` and `prover-fe` Docker images
Check if there are newer images: https://hub.docker.com/r/mysten/zklogin/tags
```
docker pull mysten/zklogin:prover-a66971815c15ba10c699203c5e3826a18eabc4ee
docker pull mysten/zklogin:prover-fe-a66971815c15ba10c699203c5e3826a18eabc4ee
```

### 2. Download the Groth16 proving .zkey file
```
mkdir -p $HOME/data/ && cd $HOME/data/
GIT_LFS_SKIP_SMUDGE=1 git clone https://github.com/sui-foundation/zklogin-ceremony-contributions.git
cd zklogin-ceremony-contributions/
git lfs pull --include "zkLogin.zkey"
```
To verify that you downloaded the correct zkey file, run `b2sum zkLogin.zkey` and check that the Blake2b hash is `060beb961802568ac9ac7f14de0fbcd55e373e8f5ec7cc32189e26fb65700aa4e36f5604f868022c765e634d14ea1cd58bd4d79cef8f3cf9693510696bcbcbce`.

### 3. Run `prover` with the downloaded .zkey
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

Check that it's running correctly (should return `pong`):
```
curl localhost:5001/ping # from the server
curl [EXTERNAL_IP_ADDRESS]:5001/ping # from the outside
```

## Salt service

A salt service returns a unique user salt from a JWT token.

(Alternatively, salts can be managed on the client side.)

Docs: https://docs.sui.io/concepts/cryptography/zklogin#user-salt-management

[salt/](./salt/) is a demo salt service (not fit for production) that you can run on your server:

### 1. Build the Docker image
```
mkdir -p $HOME/data/ && cd $HOME/data/
git clone https://github.com/juzybits/polymedia-zklogin-demo.git
cd polymedia-zklogin-demo/salt/
docker build -t salt-service .
```

### 2. Run `salt-service`
```
docker run -d -p 5002:5002 salt-service
```

Check that it's running correctly (should return `pong`):
```
curl localhost:5002/ping # from the server
curl [EXTERNAL_IP_ADDRESS]:5002/ping # from the outside
```

## Reverse proxy

To avoid CORS issues when calling the ZK proving and salt services from the webapp,
we set up an Nginx reverse proxy:

### 1. Install Nginx

```
sudo apt install -y nginx
```

### 2. Configure Nginx

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

### 3. Restart Nginx to apply changes

```
sudo systemctl restart nginx
```

Check that you can reach the prover and salt services through the proxy:
```
curl [EXTERNAL_IP_ADDRESS]/prover-fe/ping
curl [EXTERNAL_IP_ADDRESS]/salt/ping
```

### 4. Update your webapp configuration

Update your `web/src/config.json` as follows:

```
"URL_ZK_PROVER": "http://YOUR_SERVER_IP/prover-fe/v1",
"URL_SALT_SERVICE": "http://YOUR_SERVER_IP/salt/get-salt",
``````

## Common issues

If you get this error when requesting a ZK proof from your server, you'll need to upgrade to a faster server so the request can complete within 15 seconds.
```
{
  name: 'Error',
  message: 'Call to rapidsnark service took longer than 15s'
}
```
