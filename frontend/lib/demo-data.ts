export const demoEpoch = {
  id: 0,
  weeklyEmission: 12_500,
  hiddenVotes: 3,
}

export const demoGauges = [
  {
    id: 0,
    name: 'ETH / fhUSDC',
    pairLabel: 'volatile flagship pool',
    revealedWeight: 1_100,
    emissionShare: 8_974,
    angle: 'high-beta route for directional liquidity',
  },
  {
    id: 1,
    name: 'wBTC / fhETH',
    pairLabel: 'blue-chip reserve route',
    revealedWeight: 0,
    emissionShare: 625,
    angle: 'minimum strategic flow keeps reserve markets alive even in a quiet epoch',
  },
  {
    id: 2,
    name: 'sDAI / fhUSDC',
    pairLabel: 'stable carry corridor',
    revealedWeight: 300,
    emissionShare: 2_901,
    angle: 'defensive pool that still attracts hidden votes',
  },
]

export const demoAssets = [
  { id: 'fhETH', name: 'fhETH', faucetAmount: 100, walletBalance: 280 },
  { id: 'fhUSDC', name: 'fhUSDC', faucetAmount: 100, walletBalance: 320 },
  { id: 'wBTC', name: 'wBTC', faucetAmount: 100, walletBalance: 140 },
  { id: 'sDAI', name: 'sDAI', faucetAmount: 100, walletBalance: 210 },
]

export const demoPools = [
  {
    id: 0,
    name: 'ETH / fhUSDC',
    symbol: 'vLP-ETHUSDC',
    tokenIn: 'fhETH',
    tokenOut: 'fhUSDC',
    reserve0: 1000,
    reserve1: 1200,
    userLpBalance: 90,
    rewardInventory: 8_974,
  },
  {
    id: 1,
    name: 'wBTC / fhETH',
    symbol: 'vLP-WBTCFHETH',
    tokenIn: 'wBTC',
    tokenOut: 'fhETH',
    reserve0: 800,
    reserve1: 900,
    userLpBalance: 45,
    rewardInventory: 625,
  },
  {
    id: 2,
    name: 'sDAI / fhUSDC',
    symbol: 'vLP-SDAIUSDC',
    tokenIn: 'sDAI',
    tokenOut: 'fhUSDC',
    reserve0: 1100,
    reserve1: 1100,
    userLpBalance: 70,
    rewardInventory: 2_901,
  },
]

export const demoCollateralTypes = [
  {
    id: 0,
    name: 'ETH / fhUSDC LP',
    pair: 'selected volatile pair',
    priceE4: 250_000,
    deposited: 100,
    collateralValue: 2_500,
  },
  {
    id: 1,
    name: 'sDAI / fhUSDC LP',
    pair: 'selected stable carry pair',
    priceE4: 120_000,
    deposited: 50,
    collateralValue: 600,
  },
]

export const demoStablePosition = {
  collateralValue: 3_100,
  maxMintableAt160: 1_937,
  encryptedDebt: 1_937,
  encryptedStableBalance: 1_937,
}

export const protocolHighlights = [
  've-style lockups create time-decaying voting power similar to Curve and Aerodrome.',
  'Gauge votes stay encrypted during the epoch, so routing intent is hidden until reveal.',
  'Selected LP pairs can back vhUSD at a minimum 160% collateral ratio.',
  'Both VEIL and vhUSD support wrapped encrypted balances for shielded treasury and user flows.',
]
