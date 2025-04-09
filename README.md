[![Lint](https://github.com/Balmy-Protocol/swappers/actions/workflows/lint.yml/badge.svg?branch=main)](https://github.com/Balmy-Protocol/swappers/actions/workflows/lint.yml)
[![Tests](https://github.com/Balmy-Protocol/swappers/actions/workflows/tests.yml/badge.svg?branch=main)](https://github.com/Balmy-Protocol/swappers/actions/workflows/tests.yml)
[![Slither Analysis](https://github.com/Balmy-Protocol/swappers/actions/workflows/slither.yml/badge.svg?branch=main)](https://github.com/Balmy-Protocol/swappers/actions/workflows/slither.yml)

# Balmy Swappers

This repository holds Balmy's swapping infra:

## 1. The Swap Proxy

This contract act as a proxy and use the Permit2 Adapter as the backend, but with a way to take funds from the user with an ERC20 Approval.

## Usage

This is a list of the most frequently needed commands.

### Build

Build the contracts:

```sh
$ forge build
```

### Clean

Delete the build artifacts and cache directories:

```sh
$ forge clean
```

### Compile

Compile the contracts:

```sh
$ forge build
```

### Coverage

Get a test coverage report:

```sh
$ forge coverage
```

### Format

Format the contracts:

```sh
$ forge fmt
```

### Gas Usage

Get a gas report:

```sh
$ forge test --gas-report
```

### Lint

Lint the contracts:

```sh
$ pnpm lint
```

### Test

Run the tests:

```sh
$ forge test
```
