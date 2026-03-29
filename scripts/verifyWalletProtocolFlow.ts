import hre from 'hardhat'
import { Wallet } from 'ethers'
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/node'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

import { deployVeilFlowStack } from './veilflowStack'

async function initializeHardhatSigner(signer: HardhatEthersSigner) {
  await hre.cofhe.expectResultSuccess(hre.cofhe.initializeWithHardhatSigner(signer))
}

async function initializeEthersWallet(wallet: Wallet, zkvSigner: HardhatEthersSigner) {
  await hre.cofhe.expectResultSuccess(
    cofhejs.initializeWithEthers({
      ethersProvider: hre.ethers.provider,
      ethersSigner: wallet,
      environment: 'MOCK',
      mockConfig: {
        zkvSigner,
        decryptDelay: 0,
      },
    }),
  )
}

async function encryptUint8(wallet: Wallet, zkvSigner: HardhatEthersSigner, value: bigint) {
  await initializeEthersWallet(wallet, zkvSigner)
  const [encryptedValue] = await hre.cofhe.expectResultSuccess(cofhejs.encrypt([Encryptable.uint8(value)] as const))
  return encryptedValue
}

async function encryptUint128(wallet: Wallet, zkvSigner: HardhatEthersSigner, value: bigint) {
  await initializeEthersWallet(wallet, zkvSigner)
  const [encryptedValue] = await hre.cofhe.expectResultSuccess(cofhejs.encrypt([Encryptable.uint128(value)] as const))
  return encryptedValue
}

async function settleEpochWhenReady(controller: any, owner: HardhatEthersSigner, epochId: bigint) {
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      await (await controller.connect(owner).settleEpoch(epochId)).wait()
      return
    } catch (error) {
      if (!(error instanceof Error) || !error.message.includes('EpochSettlementPending')) {
        throw error
      }

      await hre.network.provider.send('evm_increaseTime', [1])
      await hre.network.provider.send('evm_mine')
    }
  }

  throw new Error('Epoch settlement stayed pending after waiting for decrypt results.')
}

async function main() {
  if (!hre.cofhe.isPermittedEnvironment('MOCK')) {
    throw new Error('walletProtocolCheck is intended for the mock Hardhat CoFHE environment.')
  }

  const privateKey = process.env.WALLET_PRIVATE_KEY
  if (!privateKey) {
    throw new Error('Set WALLET_PRIVATE_KEY before running this script.')
  }

  await hre.cofhe.mocks.deployMocks({
    deployTestBed: true,
    gasWarning: false,
    silent: true,
  })

  const [owner, guardian] = await hre.ethers.getSigners()
  const wallet = new Wallet(privateKey, hre.ethers.provider)

  await owner.sendTransaction({
    to: wallet.address,
    value: hre.ethers.parseEther('5'),
  })

  const stack = await deployVeilFlowStack()
  const assetById = new Map(stack.assets.map((asset) => [asset.id, asset] as const))
  const poolById = new Map(stack.pools.map((pool) => [pool.id, pool] as const))

  const fhEth = assetById.get('fhETH')
  const fhUsdc = assetById.get('fhUSDC')
  const wBtc = assetById.get('wBTC')
  const sDai = assetById.get('sDAI')
  const ethUsdcPool = poolById.get(0)
  const wBtcEthPool = poolById.get(1)
  const sDaiUsdcPool = poolById.get(2)

  if (!fhEth || !fhUsdc || !wBtc || !sDai || !ethUsdcPool || !wBtcEthPool || !sDaiUsdcPool) {
    throw new Error('Stack deployment is missing expected assets or pools.')
  }

  console.log(`Wallet under test: ${wallet.address}`)
  console.log(`VEIL token: ${await stack.voteToken.getAddress()}`)
  console.log(`Gauge controller: ${await stack.gaugeController.getAddress()}`)
  console.log(`Stable controller: ${await stack.stableController.getAddress()}`)

  await (await stack.voteFaucet.connect(wallet).claim()).wait()
  await (await fhEth.faucet.connect(wallet).claim()).wait()
  await (await fhUsdc.faucet.connect(wallet).claim()).wait()
  await (await wBtc.faucet.connect(wallet).claim()).wait()
  await (await sDai.faucet.connect(wallet).claim()).wait()
  console.log('Claimed VEIL and all market assets from their faucets.')

  await (await stack.voteToken.connect(wallet).approve(await stack.gaugeController.getAddress(), 100n)).wait()
  await (await stack.gaugeController.connect(wallet).lock(60n, BigInt(2 * 365 * 24 * 60 * 60))).wait()
  await (await stack.gaugeController.connect(wallet).increaseLockAmount(10n)).wait()
  await (await stack.gaugeController.connect(wallet).extendLock(BigInt(30 * 24 * 60 * 60))).wait()
  console.log('Lock, lock increase, and lock extension all succeeded.')

  await (await stack.voteToken.connect(wallet).wrap(wallet.address, 20n)).wait()
  await initializeEthersWallet(wallet, owner)
  const encryptedVeilBalance = await stack.voteToken.encBalances(wallet.address)
  const revealedWrappedVeil = await hre.cofhe.expectResultSuccess(cofhejs.unseal(encryptedVeilBalance, FheTypes.Uint128))
  console.log(`Wrapped VEIL balance decrypted for holder: ${revealedWrappedVeil.toString()}`)

  const epochId = await stack.gaugeController.currentEpoch()
  await (await stack.gaugeController.connect(wallet).vote(epochId, await encryptUint8(wallet, owner, 2n))).wait()
  console.log('Encrypted gauge vote submitted from wallet.')

  const hiddenGaugeHandle = await stack.gaugeController.getEncryptedGaugeWeight(epochId, 2)
  const hiddenGaugeResult = await cofhejs.unseal(hiddenGaugeHandle, FheTypes.Uint128)
  if (hiddenGaugeResult.success) {
    throw new Error('Gauge weight unexpectedly revealed before epoch finalization.')
  }
  console.log('Gauge weight stayed private before reveal.')

  const quotedSwapOut = await wBtcEthPool.pool.getAmountOut(await wBtc.token.getAddress(), 10n)
  await (await wBtc.token.connect(wallet).approve(await wBtcEthPool.pool.getAddress(), 10n)).wait()
  await (await wBtcEthPool.pool.connect(wallet).swap(await wBtc.token.getAddress(), 10n, quotedSwapOut - 1n)).wait()
  console.log(`Swap succeeded: 10 wBTC -> ${quotedSwapOut.toString()} fhETH (quoted output).`)

  await (await fhEth.token.connect(wallet).approve(await ethUsdcPool.pool.getAddress(), 50n)).wait()
  await (await fhUsdc.token.connect(wallet).approve(await ethUsdcPool.pool.getAddress(), 60n)).wait()
  await (await ethUsdcPool.pool.connect(wallet).addLiquidity(50n, 60n)).wait()

  await (await sDai.token.connect(wallet).approve(await sDaiUsdcPool.pool.getAddress(), 20n)).wait()
  await (await fhUsdc.token.connect(wallet).approve(await sDaiUsdcPool.pool.getAddress(), 20n)).wait()
  await (await sDaiUsdcPool.pool.connect(wallet).addLiquidity(20n, 20n)).wait()
  console.log('Added liquidity to ETH/fhUSDC and sDAI/fhUSDC pools.')

  const ethUsdcLpBalance = await ethUsdcPool.pool.balanceOf(wallet.address)
  const sDaiUsdcLpBalance = await sDaiUsdcPool.pool.balanceOf(wallet.address)
  console.log(`Minted LP balances: ${ethUsdcLpBalance.toString()} ETH/fhUSDC LP and ${sDaiUsdcLpBalance.toString()} sDAI/fhUSDC LP.`)

  await (await ethUsdcPool.pool.connect(wallet).approve(await stack.stableController.getAddress(), ethUsdcLpBalance)).wait()
  await (await sDaiUsdcPool.pool.connect(wallet).approve(await stack.stableController.getAddress(), sDaiUsdcLpBalance)).wait()
  await (await stack.stableController.connect(wallet).depositCollateral(0, ethUsdcLpBalance)).wait()
  await (await stack.stableController.connect(wallet).depositCollateral(1, sDaiUsdcLpBalance)).wait()
  console.log('LP collateral deposited from wallet.')

  await (await stack.stableController.connect(wallet).mintStable(await encryptUint128(wallet, owner, 900n))).wait()
  const encryptedStableBalance = await stack.stableToken.encBalances(wallet.address)
  const encryptedStableDebt = await stack.stableController.getEncryptedDebt(wallet.address)

  const revealedStableBalance = await hre.cofhe.expectResultSuccess(cofhejs.unseal(encryptedStableBalance, FheTypes.Uint128))
  const revealedDebt = await hre.cofhe.expectResultSuccess(cofhejs.unseal(encryptedStableDebt, FheTypes.Uint128))
  console.log(`vhUSD balance decrypted for holder: ${revealedStableBalance.toString()}`)
  console.log(`vhUSD debt decrypted for holder: ${revealedDebt.toString()}`)

  await (
    await stack.stableToken
      .connect(wallet)
      ['transferEncrypted(address,(uint256,uint8,uint8,bytes))'](guardian.address, await encryptUint128(wallet, owner, 150n))
  ).wait()

  await initializeHardhatSigner(guardian)
  const guardianEncryptedStable = await stack.stableToken.encBalances(guardian.address)
  const guardianStableBalance = await hre.cofhe.expectResultSuccess(cofhejs.unseal(guardianEncryptedStable, FheTypes.Uint128))
  console.log(`Encrypted stable transfer succeeded, guardian received: ${guardianStableBalance.toString()} vhUSD`)

  await hre.network.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 5])
  await hre.network.provider.send('evm_mine')

  await (await stack.gaugeController.connect(owner).revealEpoch(epochId)).wait()
  await settleEpochWhenReady(stack.gaugeController, owner, epochId)

  await initializeHardhatSigner(owner)
  const revealedGaugeWeight = await hre.cofhe.expectResultSuccess(
    cofhejs.unseal(await stack.gaugeController.getEncryptedGaugeWeight(epochId, 2), FheTypes.Uint128),
  )
  console.log(`Epoch reveal succeeded, selected gauge weight: ${revealedGaugeWeight.toString()}`)

  const gaugeZeroEmission = await stack.gaugeController.epochGaugeEmission(epochId, 0)
  const gaugeOneEmission = await stack.gaugeController.epochGaugeEmission(epochId, 1)
  const gaugeTwoEmission = await stack.gaugeController.epochGaugeEmission(epochId, 2)
  console.log(
    `Settled VEIL emissions: ETH/fhUSDC=${gaugeZeroEmission.toString()}, wBTC/fhETH=${gaugeOneEmission.toString()}, sDAI/fhUSDC=${gaugeTwoEmission.toString()}`,
  )

  const poolZeroVeil = await stack.voteToken.balanceOf(await ethUsdcPool.pool.getAddress())
  const poolOneVeil = await stack.voteToken.balanceOf(await wBtcEthPool.pool.getAddress())
  const poolTwoVeil = await stack.voteToken.balanceOf(await sDaiUsdcPool.pool.getAddress())
  console.log(
    `Gauge recipients received VEIL on-chain: pool0=${poolZeroVeil.toString()}, pool1=${poolOneVeil.toString()}, pool2=${poolTwoVeil.toString()}`,
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
