import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox/network-helpers'
import { expect } from 'chai'
import hre from 'hardhat'

describe('VeilFaucet', function () {
  async function deployFaucetFixture() {
    const [owner, alice, bob] = await hre.ethers.getSigners()

    const VeilToken = await hre.ethers.getContractFactory('VeilToken')
    const token = await VeilToken.connect(owner).deploy()
    await token.waitForDeployment()

    const VeilFaucet = await hre.ethers.getContractFactory('VeilFaucet')
    const faucet = await VeilFaucet.connect(owner).deploy(await token.getAddress())
    await faucet.waitForDeployment()

    await (await token.connect(owner).mint(await faucet.getAddress(), 1_000n)).wait()

    return { owner, alice, bob, token, faucet }
  }

  it('lets a wallet claim 100 VEIL once per 24 hours', async function () {
    const { alice, token, faucet } = await loadFixture(deployFaucetFixture)

    await (await faucet.connect(alice).claim()).wait()
    expect(await token.balanceOf(alice.address)).to.equal(100n)

    await expect(faucet.connect(alice).claim()).to.be.reverted

    await time.increase(24 * 60 * 60 + 1)
    await (await faucet.connect(alice).claim()).wait()

    expect(await token.balanceOf(alice.address)).to.equal(200n)
  })

  it('tracks cooldown per wallet independently', async function () {
    const { alice, bob, token, faucet } = await loadFixture(deployFaucetFixture)

    await (await faucet.connect(alice).claim()).wait()
    await (await faucet.connect(bob).claim()).wait()

    expect(await token.balanceOf(alice.address)).to.equal(100n)
    expect(await token.balanceOf(bob.address)).to.equal(100n)
  })
})
