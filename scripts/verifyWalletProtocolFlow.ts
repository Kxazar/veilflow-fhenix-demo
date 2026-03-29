import hre from 'hardhat'
import { Wallet } from 'ethers'
import { cofhejs, Encryptable, FheTypes } from 'cofhejs/node'
import { HardhatEthersSigner } from '@nomicfoundation/hardhat-ethers/signers'

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
	const [encryptedValue] = await hre.cofhe.expectResultSuccess(
		cofhejs.encrypt([Encryptable.uint8(value)] as const),
	)
	return encryptedValue
}

async function encryptUint128(wallet: Wallet, zkvSigner: HardhatEthersSigner, value: bigint) {
	await initializeEthersWallet(wallet, zkvSigner)
	const [encryptedValue] = await hre.cofhe.expectResultSuccess(
		cofhejs.encrypt([Encryptable.uint128(value)] as const),
	)
	return encryptedValue
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

	const VeilToken = await hre.ethers.getContractFactory('VeilToken')
	const token = await VeilToken.connect(owner).deploy()
	await token.waitForDeployment()

	const VeilFaucet = await hre.ethers.getContractFactory('VeilFaucet')
	const faucet = await VeilFaucet.connect(owner).deploy(await token.getAddress())
	await faucet.waitForDeployment()

	const GaugeController = await hre.ethers.getContractFactory('ConfidentialGaugeController')
	const gaugeController = await GaugeController.connect(owner).deploy(await token.getAddress(), 12_500n)
	await gaugeController.waitForDeployment()

	const VeilStablecoin = await hre.ethers.getContractFactory('VeilStablecoin')
	const stable = await VeilStablecoin.connect(owner).deploy()
	await stable.waitForDeployment()

	const StableController = await hre.ethers.getContractFactory('ConfidentialStableController')
	const stableController = await StableController.connect(owner).deploy(await stable.getAddress())
	await stableController.waitForDeployment()

	const MockLPToken = await hre.ethers.getContractFactory('MockLPToken')
	const ethUsdcLp = await MockLPToken.connect(owner).deploy('ETH / fhUSDC LP', 'vLP-ETHUSDC')
	await ethUsdcLp.waitForDeployment()
	const sdaiUsdcLp = await MockLPToken.connect(owner).deploy('sDAI / fhUSDC LP', 'vLP-SDAIUSDC')
	await sdaiUsdcLp.waitForDeployment()

	await (await stable.connect(owner).setMinter(await stableController.getAddress(), true)).wait()
	await (await token.connect(owner).mint(await faucet.getAddress(), 2_000n)).wait()
	await (await ethUsdcLp.connect(owner).mint(wallet.address, 50n)).wait()
	await (await sdaiUsdcLp.connect(owner).mint(wallet.address, 20n)).wait()

	await (await gaugeController.connect(owner).registerGauge('ETH / fhUSDC', 'volatile flagship pool', owner.address)).wait()
	await (await gaugeController.connect(owner).registerGauge('wBTC / fhETH', 'blue-chip reserve route', owner.address)).wait()
	await (await gaugeController.connect(owner).registerGauge('sDAI / fhUSDC', 'stable carry corridor', owner.address)).wait()

	await (await stableController.connect(owner).addCollateralType('ETH / fhUSDC', await ethUsdcLp.getAddress(), 250_000)).wait()
	await (await stableController.connect(owner).addCollateralType('sDAI / fhUSDC', await sdaiUsdcLp.getAddress(), 120_000)).wait()

	console.log(`Wallet under test: ${wallet.address}`)
	console.log(`VEIL token: ${await token.getAddress()}`)
	console.log(`VEIL faucet: ${await faucet.getAddress()}`)

	await (await faucet.connect(wallet).claim()).wait()
	console.log('Claimed 100 VEIL from faucet.')

	await (await token.connect(wallet).approve(await gaugeController.getAddress(), 100n)).wait()
	await (await gaugeController.connect(wallet).lock(60n, BigInt(2 * 365 * 24 * 60 * 60))).wait()
	await (await gaugeController.connect(wallet).increaseLockAmount(10n)).wait()
	await (await gaugeController.connect(wallet).extendLock(BigInt(30 * 24 * 60 * 60))).wait()
	console.log('Lock, lock increase, and lock extension all succeeded.')

	await (await token.connect(wallet).wrap(wallet.address, 20n)).wait()
	await initializeEthersWallet(wallet, owner)
	const encryptedVeilBalance = await token.encBalances(wallet.address)
	const revealedWrappedVeil = await hre.cofhe.expectResultSuccess(
		cofhejs.unseal(encryptedVeilBalance, FheTypes.Uint128),
	)
	console.log(`Wrapped VEIL balance decrypted for holder: ${revealedWrappedVeil.toString()}`)

	const epochId = await gaugeController.currentEpoch()
	await (await gaugeController.connect(wallet).vote(epochId, await encryptUint8(wallet, owner, 2n))).wait()
	console.log('Encrypted gauge vote submitted from wallet.')

	const hiddenGaugeHandle = await gaugeController.getEncryptedGaugeWeight(epochId, 2)
	const hiddenGaugeResult = await cofhejs.unseal(hiddenGaugeHandle, FheTypes.Uint128)
	if (hiddenGaugeResult.success) {
		throw new Error('Gauge weight unexpectedly revealed before epoch finalization.')
	}
	console.log('Gauge weight stayed private before reveal.')

	await (await ethUsdcLp.connect(wallet).approve(await stableController.getAddress(), 50n)).wait()
	await (await sdaiUsdcLp.connect(wallet).approve(await stableController.getAddress(), 20n)).wait()
	await (await stableController.connect(wallet).depositCollateral(0, 50n)).wait()
	await (await stableController.connect(wallet).depositCollateral(1, 20n)).wait()
	console.log('LP collateral deposited from wallet.')

	await (await stableController.connect(wallet).mintStable(await encryptUint128(wallet, owner, 900n))).wait()
	const encryptedStableBalance = await stable.encBalances(wallet.address)
	const encryptedStableDebt = await stableController.getEncryptedDebt(wallet.address)

	const revealedStableBalance = await hre.cofhe.expectResultSuccess(
		cofhejs.unseal(encryptedStableBalance, FheTypes.Uint128),
	)
	const revealedDebt = await hre.cofhe.expectResultSuccess(
		cofhejs.unseal(encryptedStableDebt, FheTypes.Uint128),
	)
	console.log(`vhUSD balance decrypted for holder: ${revealedStableBalance.toString()}`)
	console.log(`vhUSD debt decrypted for holder: ${revealedDebt.toString()}`)

	await (
		await stable
			.connect(wallet)
			['transferEncrypted(address,(uint256,uint8,uint8,bytes))'](
				guardian.address,
				await encryptUint128(wallet, owner, 150n),
			)
	).wait()
	await initializeHardhatSigner(guardian)
	const guardianEncryptedStable = await stable.encBalances(guardian.address)
	const guardianStableBalance = await hre.cofhe.expectResultSuccess(
		cofhejs.unseal(guardianEncryptedStable, FheTypes.Uint128),
	)
	console.log(`Encrypted stable transfer succeeded, guardian received: ${guardianStableBalance.toString()} vhUSD`)

	await hre.network.provider.send('evm_increaseTime', [7 * 24 * 60 * 60 + 5])
	await hre.network.provider.send('evm_mine')
	await (await gaugeController.connect(owner).revealEpoch(epochId)).wait()

	await initializeHardhatSigner(owner)
	const revealedGaugeWeight = await hre.cofhe.expectResultSuccess(
		cofhejs.unseal(await gaugeController.getEncryptedGaugeWeight(epochId, 2), FheTypes.Uint128),
	)
	console.log(`Epoch reveal succeeded, selected gauge weight: ${revealedGaugeWeight.toString()}`)
}

main().catch((error) => {
	console.error(error)
	process.exitCode = 1
})
