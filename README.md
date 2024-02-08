# Sui zkLogin demo

![Sui zkLogin demo](https://assets.polymedia.app/img/zklogin/open-graph.png)

A Sui zkLogin end-to-end implementation.

It shows how to use Google/Twitch/Facebook to create a Sui zkLogin address and send a transaction.

The code is meant to be as simple as possible to demonstrate how to put all the pieces together.

Official docs: https://docs.sui.io/concepts/cryptography/zklogin

## OpenID providers

You'll need to create a developer account on Google/Twitch/Facebook. Then, create an "app" from which you can obtain the Client ID to populate your `web/src/config.json`.

Developer consoles: [Google](https://console.cloud.google.com/home/dashboard), [Twitch](https://dev.twitch.tv/console), [Facebook](https://developers.facebook.com/apps/).

Docs: https://docs.sui.io/concepts/cryptography/zklogin#configure-a-developer-account-with-openid-provider

## Front-end

This is a simple React app. The code is designed to be serve as a tutorial for how to implement
zkLogin, and there are comments that explain the different steps.

All the relevant code is in [web/src/App.tsx](./web/src/App.tsx)

#### Local development

\- Copy `web/config.example.json` into `web/config.json` and modify it.

\- Run the app locally:
```bash
cd web/
pnpm install
pnpm serve
```

## Back-end

When I first built this demo app, Mysten Labs didn't offer a devnet proving service. So I wrote
a guide to help people set up their own prover. It also shows how to set up a dummy salt service. Doing this is no longer needed to run the app, so the tutorial is not being maintained, but you can find it in
[old-backend-tutorial/README.md](./old-backend-tutorial/README.md)

## Additional resources

### Docs

Official Docs<br/>
https://docs.sui.io/concepts/cryptography/zklogin

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

Set Up a Proving Service for zkLogin<br/>
https://blog.sui.io/proving-service-zklogin/

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
