import { loadFixture } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'

describe('VeilLiquidityPool', function () {
  async function deployPoolFixture() {
    const [owner, alice] = await hre.ethers.getSigners()

    const MockAssetToken = await hre.ethers.getContractFactory('MockAssetToken')
    const fhEth = await MockAssetToken.connect(owner).deploy('Fhenix ETH', 'fhETH')
    await fhEth.waitForDeployment()
    const fhUsdc = await MockAssetToken.connect(owner).deploy('Fhenix USDC', 'fhUSDC')
    await fhUsdc.waitForDeployment()

    const Pool = await hre.ethers.getContractFactory('VeilLiquidityPool')
    const pool = await Pool.connect(owner).deploy(
      'ETH / fhUSDC LP',
      'vLP-ETHUSDC',
      await fhEth.getAddress(),
      await fhUsdc.getAddress(),
    )
    await pool.waitForDeployment()

    await (await fhEth.connect(owner).mint(alice.address, 200n)).wait()
    await (await fhUsdc.connect(owner).mint(alice.address, 200n)).wait()

    await (await fhEth.connect(alice).approve(await pool.getAddress(), 200n)).wait()
    await (await fhUsdc.connect(alice).approve(await pool.getAddress(), 200n)).wait()

    return { owner, alice, fhEth, fhUsdc, pool }
  }

  it('mints LP shares when liquidity is added', async function () {
    const { alice, pool } = await loadFixture(deployPoolFixture)

    await (await pool.connect(alice).addLiquidity(100n, 100n)).wait()

    expect(await pool.balanceOf(alice.address)).to.equal(100n)
    const [reserve0, reserve1] = await pool.getReserves()
    expect(reserve0).to.equal(100n)
    expect(reserve1).to.equal(100n)
  })

  it('executes swaps with the pool reserves', async function () {
    const { alice, fhEth, fhUsdc, pool } = await loadFixture(deployPoolFixture)

    await (await pool.connect(alice).addLiquidity(100n, 100n)).wait()
    await (await pool.connect(alice).swap(await fhEth.getAddress(), 10n, 8n)).wait()

    expect(await fhEth.balanceOf(alice.address)).to.equal(90n)
    expect(await fhUsdc.balanceOf(alice.address)).to.equal(109n)
  })
})
