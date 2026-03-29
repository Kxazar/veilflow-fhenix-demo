# VeilFlow: Fhenix Confidential DeFi Demo

This repository started from the official `cofhe-hardhat-starter` and now contains a larger Fhenix showcase:

- confidential private voting
- a ve-style gauge controller inspired by Curve and Aerodrome
- wrapped encrypted VEIL balances adapted from the FHERC20 patterns in `marronjo/fhe-hook-template`
- an on-chain VEIL faucet that dispenses 100 tokens once per 24 hours per wallet
- a shielded LP-backed stablecoin controller with 160% minimum collateralization
- a Next.js interface for demo mode now and live Fhenix mode later

## What is included

### `PrivateVoting`

A minimal CoFHE voting primitive that keeps tallies hidden until reveal.

### `ConfidentialGaugeController`

A ve-tokenomics module where:

- users lock `VEIL`
- voting power decays linearly with time
- every vote is submitted as encrypted `InEuint8`
- all gauge tallies are updated each vote with `FHE.select(...)`
- epoch weights stay hidden until `revealEpoch`

### `VeilToken`

A hybrid vote token with:

- standard ERC20 balances for locking and public liquidity flows
- encrypted balances for shielded treasury or user balances
- `wrap(...)` and encrypted transfer paths modeled after Fhenix FHERC20 patterns
- integer-style token units (`0` decimals) so wallet and faucet amounts are human-readable in the demo

### `VeilFaucet`

An on-chain faucet for `VEIL` where:

- each wallet can claim `100 VEIL`
- claims are limited to one request every `24 hours`
- cooldown enforcement lives in the contract, not in the frontend

### `ConfidentialStableController` + `VeilStablecoin`

A stablecoin rail where:

- only approved LP pairs can be used as collateral
- collateral values are tracked with configurable prices
- users submit encrypted desired mint amounts
- the controller clips the encrypted request to the safe headroom
- vhUSD debt and vhUSD balances remain encrypted until the holder decrypts them with a permit

### `frontend/`

A Next.js app called `VeilFlow` that includes:

- wallet + permit rail
- ve lock planner
- confidential gauge voting console
- encrypted vhUSD mint panel
- VEIL faucet tab
- demo mode by default
- live-ready mode via env vars for RPC, CoFHE endpoints, and deployed contract addresses

## Tech sources used

- `marronjo/fhe-hook-template`
- `FhenixProtocol/poc-shielded-stablecoin`
- `FhenixProtocol/encrypted-secret-santa`

The contracts and frontend patterns were adapted to the current toolchain version that actually works in this starter environment.

## Prerequisites

- Node.js 20+
- `corepack` or `pnpm`

## Setup

### Contracts

```bash
corepack pnpm install
```

### Frontend

```bash
cd frontend
corepack pnpm install
```

## Contract demos

### Private voting

```bash
corepack pnpm demo:voting
corepack pnpm test:voting
```

### Confidential gauges

```bash
corepack pnpm demo:gauges
corepack pnpm test:gauges
```

### Shielded stablecoin

```bash
corepack pnpm test:stable
```

### VEIL faucet

```bash
corepack pnpm test:faucet
```

### Wallet flow verification

Run the full faucet -> ve lock -> vote -> LP collateral -> vhUSD flow with a provided private key:

```bash
WALLET_PRIVATE_KEY=... corepack pnpm demo:wallet-check
```

### Full suite

```bash
corepack pnpm test
```

## Frontend usage

### Demo mode

The interface ships in demo mode by default and can be deployed immediately without live contracts:

```bash
cd frontend
corepack pnpm dev
```

### Live mode

Copy `frontend/.env.example` into your local env file and provide:

- RPC URL
- CoFHE endpoint URLs
- deployed contract addresses
- faucet address
- approved collateral token addresses

Then switch:

```bash
NEXT_PUBLIC_APP_MODE=live
```

## Important files

- `contracts/PrivateVoting.sol`
- `contracts/ConfidentialGaugeController.sol`
- `contracts/VeilToken.sol`
- `contracts/VeilFaucet.sol`
- `contracts/VeilStablecoin.sol`
- `contracts/ConfidentialStableController.sol`
- `scripts/privateVotingDemo.ts`
- `scripts/confidentialVeGaugeDemo.ts`
- `scripts/verifyWalletProtocolFlow.ts`
- `test/ConfidentialGaugeController.test.ts`
- `test/ConfidentialStableController.test.ts`
- `test/VeilFaucet.test.ts`
- `frontend/app/page.tsx`
- `frontend/hooks/useCofhe.ts`

## Current status

- Hardhat suite is green locally
- `frontend` production build is green locally
- the frontend is deployable now in demo mode and becomes interactive in live mode once envs are provided
