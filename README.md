[![Lint](https://github.com/Mean-Finance/swap-proxy/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swap-proxy/actions/workflows/lint.yml)
[![Tests](https://github.com/Mean-Finance/swap-proxy/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swap-proxy/actions/workflows/tests.yml)
[![Slither Analysis](https://github.com/Mean-Finance/swap-proxy/actions/workflows/slither.yml/badge.svg?branch=main)](https://github.com/Mean-Finance/swap-proxy/actions/workflows/slither.yml)

# Mean Finance Swap Proxy

This repository will hold Mean's Swap Proxy. This contract will simply have a list of allowlisted contracts that executes swaps, such as dexes, aggregators or transformers.

Our contract will simply validate that the target is indeed allowlisted, and delegate the call.

## Package

The package will contain:

- Artifacts can be found under `@mean-finance/swap-proxy/artifacts`
- Compatible deployments for [hardhat-deploy](https://github.com/wighawag/hardhat-deploy) plugin under the `@mean-finance/swap-proxy/deployments` folder.
- Typescript smart contract typings under `@mean-finance/swap-proxy/typechained`

## Documentation

Everything that you need to know as a developer on how to use all repository smart contracts can be found in the [documented interfaces](./solidity/interfaces/).

## Installation

To install with [**Hardhat**](https://github.com/nomiclabs/hardhat) or [**Truffle**](https://github.com/trufflesuite/truffle):

#### YARN

```sh
yarn install @mean-finance/swap-proxy
```

### NPM

```sh
npm install @mean-finance/swap-proxy
```
