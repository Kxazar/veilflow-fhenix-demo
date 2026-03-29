import hre from 'hardhat'

const WEEKLY_EMISSION = 12_500n
const EMISSION_INVENTORY = 100_000n
const VEIL_FAUCET_INVENTORY = 25_000n
const OWNER_VEIL_INVENTORY = 10_000n
const ASSET_FAUCET_INVENTORY = 25_000n
const OWNER_ASSET_INVENTORY = 10_000n

export const assetSpecs = [
  { id: 'fhETH', name: 'Fhenix ETH', symbol: 'fhETH' },
  { id: 'fhUSDC', name: 'Fhenix USDC', symbol: 'fhUSDC' },
  { id: 'wBTC', name: 'Wrapped Bitcoin', symbol: 'wBTC' },
  { id: 'sDAI', name: 'Savings DAI', symbol: 'sDAI' },
] as const

export const poolSpecs = [
  {
    id: 0,
    name: 'ETH / fhUSDC',
    symbol: 'vLP-ETHUSDC',
    pairLabel: 'volatile flagship pool',
    token0Id: 'fhETH',
    token1Id: 'fhUSDC',
    seed0: 1_000n,
    seed1: 1_200n,
    collateralPriceE4: 250_000n,
  },
  {
    id: 1,
    name: 'wBTC / fhETH',
    symbol: 'vLP-WBTCFHETH',
    pairLabel: 'blue-chip reserve route',
    token0Id: 'wBTC',
    token1Id: 'fhETH',
    seed0: 800n,
    seed1: 900n,
  },
  {
    id: 2,
    name: 'sDAI / fhUSDC',
    symbol: 'vLP-SDAIUSDC',
    pairLabel: 'stable carry corridor',
    token0Id: 'sDAI',
    token1Id: 'fhUSDC',
    seed0: 1_100n,
    seed1: 1_100n,
    collateralPriceE4: 120_000n,
  },
] as const

type AssetDeployment = {
  id: string
  name: string
  symbol: string
  token: any
  faucet: any
}

type PoolDeployment = {
  id: number
  name: string
  symbol: string
  pairLabel: string
  token0Id: string
  token1Id: string
  pool: any
  seed0: bigint
  seed1: bigint
  collateralPriceE4?: bigint
}

export async function deployVeilFlowStack() {
  const [owner] = await hre.ethers.getSigners()

  const VeilToken = await hre.ethers.getContractFactory('VeilToken')
  const VeilFaucet = await hre.ethers.getContractFactory('VeilFaucet')
  const GaugeController = await hre.ethers.getContractFactory('ConfidentialGaugeController')
  const VeilStablecoin = await hre.ethers.getContractFactory('VeilStablecoin')
  const StableController = await hre.ethers.getContractFactory('ConfidentialStableController')
  const MockAssetToken = await hre.ethers.getContractFactory('MockAssetToken')
  const VeilLiquidityPool = await hre.ethers.getContractFactory('VeilLiquidityPool')

  const voteToken = await VeilToken.connect(owner).deploy()
  await voteToken.waitForDeployment()

  const voteFaucet = await VeilFaucet.connect(owner).deploy(await voteToken.getAddress())
  await voteFaucet.waitForDeployment()

  const gaugeController = await GaugeController.connect(owner).deploy(await voteToken.getAddress(), WEEKLY_EMISSION)
  await gaugeController.waitForDeployment()

  const stableToken = await VeilStablecoin.connect(owner).deploy()
  await stableToken.waitForDeployment()

  const stableController = await StableController.connect(owner).deploy(await stableToken.getAddress())
  await stableController.waitForDeployment()
  await (await stableToken.connect(owner).setMinter(await stableController.getAddress(), true)).wait()

  await (await voteToken.connect(owner).mint(await voteFaucet.getAddress(), VEIL_FAUCET_INVENTORY)).wait()
  await (await voteToken.connect(owner).mint(await gaugeController.getAddress(), EMISSION_INVENTORY)).wait()
  await (await voteToken.connect(owner).mint(owner.address, OWNER_VEIL_INVENTORY)).wait()

  const assets: AssetDeployment[] = []
  for (const spec of assetSpecs) {
    const token = await MockAssetToken.connect(owner).deploy(spec.name, spec.symbol)
    await token.waitForDeployment()

    const faucet = await VeilFaucet.connect(owner).deploy(await token.getAddress())
    await faucet.waitForDeployment()

    await (await token.connect(owner).mint(await faucet.getAddress(), ASSET_FAUCET_INVENTORY)).wait()
    await (await token.connect(owner).mint(owner.address, OWNER_ASSET_INVENTORY)).wait()

    assets.push({
      id: spec.id,
      name: spec.name,
      symbol: spec.symbol,
      token,
      faucet,
    })
  }

  const assetById = new Map(assets.map((asset) => [asset.id, asset] as const))
  const pools: PoolDeployment[] = []

  for (const spec of poolSpecs) {
    const token0 = assetById.get(spec.token0Id)
    const token1 = assetById.get(spec.token1Id)
    if (!token0 || !token1) {
      throw new Error(`Missing market asset for pool ${spec.name}`)
    }

    const pool = await VeilLiquidityPool.connect(owner).deploy(
      `${spec.name} LP`,
      spec.symbol,
      await token0.token.getAddress(),
      await token1.token.getAddress(),
    )
    await pool.waitForDeployment()

    await (await token0.token.connect(owner).approve(await pool.getAddress(), spec.seed0)).wait()
    await (await token1.token.connect(owner).approve(await pool.getAddress(), spec.seed1)).wait()
    await (await pool.connect(owner).addLiquidity(spec.seed0, spec.seed1)).wait()

    await (await gaugeController.connect(owner).registerGauge(spec.name, spec.pairLabel, await pool.getAddress())).wait()

    if (spec.collateralPriceE4) {
      await (await stableController.connect(owner).addCollateralType(spec.name, await pool.getAddress(), spec.collateralPriceE4)).wait()
    }

    pools.push({
      id: spec.id,
      name: spec.name,
      symbol: spec.symbol,
      pairLabel: spec.pairLabel,
      token0Id: spec.token0Id,
      token1Id: spec.token1Id,
      pool,
      seed0: spec.seed0,
      seed1: spec.seed1,
      collateralPriceE4: spec.collateralPriceE4,
    })
  }

  return {
    owner,
    weeklyEmission: WEEKLY_EMISSION,
    emissionInventory: EMISSION_INVENTORY,
    voteToken,
    voteFaucet,
    gaugeController,
    stableToken,
    stableController,
    assets,
    pools,
  }
}
