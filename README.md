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

This is a simple React app. The code is meant to be a tutorial for how to implement
Sui zkLogin, and there are comments that explain the different steps.

All the relevant code is in [web/src/App.tsx](./web/src/App.tsx)

#### Local development

Copy `web/config.example.json` into `web/config.json` and modify it.

Run the app locally:
```bash
cd web/
pnpm install
pnpm serve
```

## Back-end

### ZK proving service

This app uses the devnet prover that's maintained by Mysten Labs.

Alternatively, you can run your own prover:
https://docs.sui.io/concepts/cryptography/zklogin#run-the-proving-service-in-your-backend

## Salt service

This app uses a hard-coded value for the salt so it works out of the box without any further setup.

In production you have a few alternatives:

- You can use the salt service that's maintained by Mysten Labs (you'll have to contact
them to get whitelisted).

- You can ask the user to provide the salt, who must remember it as if it was a password.

- You can run your own salt service to return a unique salt for each user.

https://docs.sui.io/concepts/cryptography/zklogin#user-salt-management

## Resources

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
https://github.com/sui-foundation/security-audits/blob/main/docs/zksecurity_zklogin-circuits.pdf
