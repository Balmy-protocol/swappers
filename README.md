[![Lint](https://github.com/Mean-Finance/swappers/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swappers/actions/workflows/lint.yml)
[![Tests](https://github.com/Mean-Finance/swappers/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swappers/actions/workflows/tests.yml)
[![Slither Analysis](https://github.com/Mean-Finance/swappers/actions/workflows/slither.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swappers/actions/workflows/slither.yml)

# Mean Finance Swappers

This repository holds Mean's swapping infra. We can divide it into 4 different components:

## 1. The Swapper Registry

This contract will function as a registry for all allowed swappers. Since we will allow swappers to take arbitrary calls, we need to have an allowlist. If we didn't, then we could easily get attacked.

## 2. The Swap Adapter

This abstract contract will give contracts that implement it swapping capabilities. It will make integration with swappers much easier, as it will handle validations, approvals, execution and transfers.

## 3. Swap Extensions

These are different versions of the Swap Adapter, built for different scenarios. Other contracts can simply implement these extensions and they will support swapping out of the box.

## 4. The Swap Proxy

This contract implements all swap extensions, so it can be used by EOAs or other contracts that do not have the extensions.

## Package

The package will contain:

- Artifacts can be found under `@mean-finance/swappers/artifacts`
- Compatible deployments for [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) plugin under the `@mean-finance/swappers/deployments` folder.
- Typescript smart contract typings under `@mean-finance/swappers/typechained`

## Documentation

Everything that you need to know as a developer on how to use all repository smart contracts can be found in the [documented interfaces](./solidity/interfaces/).

## Installation

To install with [**Hardhat**](https://github.com/nomiclabs/hardhat) or [**Truffle**](https://github.com/trufflesuite/truffle):

#### YARN

```sh
yarn install @mean-finance/swappers
```

### NPM

```sh
npm install @mean-finance/swappers
```
