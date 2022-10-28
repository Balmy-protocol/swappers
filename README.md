[![Lint](https://github.com/Mean-Finance/swappers/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swappers/actions/workflows/lint.yml)
[![Tests](https://github.com/Mean-Finance/swappers/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swappers/actions/workflows/tests.yml)
[![Slither Analysis](https://github.com/Mean-Finance/swappers/actions/workflows/slither.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swappers/actions/workflows/slither.yml)

# Mean Finance Swappers

This repository holds Mean's swapping infra. We can divide it into 4 different components:

## 1. The Swapper Registry

This contract will function as a registry for all allowed swappers and allowance targets. Since we will allow swappers to take arbitrary calls and approve arbitrary addresses, we need to have an allowlist. If we didn't, then we could easily get attacked.

## 2. The Swap Adapter

This abstract contract will give contracts that implement it swapping capabilities. It will make integration with swappers much easier, as it will handle validations, approvals, execution and transfers.

## 3. Swap Extensions

These are different versions of the Swap Adapter, built for different scenarios. Other contracts can simply implement these extensions and they will support swapping out of the box.

## 4. The Swap Proxy

This contract implements all swap extensions, so it can be used by EOAs or other contracts that do not have the extensions.

## 🔒 Audits

Oracles has been audited by [Omniscia](https://omniscia.io/) and can be find [here](https://omniscia.io/reports/mean-finance-swappers-module).

## 📦 NPM/YARN Package

The package will contain:

- Artifacts can be found under `@mean-finance/swappers/artifacts`
- Typescript smart contract typings under `@mean-finance/swappers/typechained`

## 📚 Documentation

Everything that you need to know as a developer on how to use all repository smart contracts can be found in the [documented interfaces](./solidity/interfaces/).

## 🛠 Installation

To install with [**Hardhat**](https://github.com/nomiclabs/hardhat) or [**Truffle**](https://github.com/trufflesuite/truffle):

#### YARN

```sh
yarn add @mean-finance/swappers
```

### NPM

```sh
npm install @mean-finance/swappers
```

## 📖 Deployment Registry

Contracts are deployed at the same address on all available networks via the [deterministic contract factory](https://github.com/Mean-Finance/deterministic-factory)

> Available networks: Optimism, Arbitrum One, Polygon.

- SwapperRegistry: `0xd6C8fd8100252F0a314407C26e7A47286F7Fda24`
- SwapProxy: `0xca341351FA4D98a3EE7eb688796B796603128d85`
