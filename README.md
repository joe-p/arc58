# Plugin-Based Account Abstaction

This repo contains proof-of-concept contracts for plugin-based account abstraction.

ARC58 PR: https://github.com/algorandfoundation/ARCs/pull/269

## Abstracted Account
[The abstracted account app](./contracts/abstracted_account.algo.ts) acts as the primary logic for the abstracted account. The app address of this app is effectively the end-user's address. The user can always rekey the contract address to their externally owned account (EOA) to gain more flexible control over the account. If the user wants to add more functionality to their abstracted account, they can add a plugin. A plugin is an app deployment that contains some functionality that sends inner transactions from the abstracted account (and eventually rekeys back).

## Plugins
[The subscription plugin](./contracts/plugins/subscription_plugin.algo.ts) is a plugin that allows someone to set up a recurring payment from the abstracted account.

[The OptIn plugin](./contracts/plugins/optin_plugin.algo.ts) is a plugin that allows anyone to opt the abstracted account into an asset, provided they pay for the MBR.

## Tests

Testing of both plugins can be found at [./\_\_test\_\_/abstract_account_plugins.test.ts](./__test__/abstract_account_plugins.test.ts)

Not all functionality of the abstracted account has been tested yet.

## Sequences

### Onboard New 0-ALGO Account

```mermaid
sequenceDiagram
    participant Wallet
    participant Dapp
    participant Abstracted App
    participant OptIn Plugin
    Wallet->>Wallet: Create keypair
    note over Wallet: The user should not see<br/>nor care about the address
    Wallet->>Dapp: Send public key
    Dapp->>Abstracted App: createApplication({ admin: Dapp })
    Dapp->>Abstracted App: Add opt-in plugin
    Dapp->>Abstracted App: changeAdmin({ admin: Alice })
    note over Dapp,Abstracted App: There could also be a specific implementation that does<br/>the above three tranasctions upon create
    Dapp->>Wallet: Abstracted App ID
    note over Wallet: The user sees the<br/> Abstracted App Address
    par Opt-In Transaction Group
        Dapp->>Abstracted App: arc58_rekeyToPlugin({ plugin: OptIn Plugin })
        Dapp->>Abstracted App: Send ASA MBR
        Dapp->>OptIn Plugin: optIn(asset)
        Dapp->>Abstracted App: arc58_verifyAuthAddr
    end 
```

### Transition Existing Address

If a user wants to transition an existing keypair-based account to an abstracted account and use the existing secret key for admin actions, they need to perform the following steps


```mermaid
sequenceDiagram
    participant Wallet
    participant Abstracted App
    note over Wallet: Address: EXISTING_ADDRESS<br/>Auth Addr: EXISTING_ADDRESS
    Wallet->>Wallet: Create new keypair
    note over Wallet: Address: NEW_ADDRESS<br/>Auth Addr: NEW_ADDRESS
    Wallet->>Wallet: Rekey NEW_ADDRESS to EXISTING_ADDRESS
    note over Wallet: Address: NEW_ADDRESS<br/>Auth Addr: EXISTING_ADDRESS
    Wallet->>Abstracted App: createApplication({ admin: NEW_ADDRESS, controlledAddress: EXISTING_ADDRESS })
    note over Abstracted App: Address: APP_ADDRESS<br/>Admin: NEW_ADDRESS<br/>Controlled Address: EXISTING_ADDRESS
    Wallet->>Wallet: Rekey EXISTING_ADDRESS to APP_ADDRESS
    note over Wallet: Address: EXISTING_ADDRESS<br/>Auth Addr: APP_ADDRESS
```