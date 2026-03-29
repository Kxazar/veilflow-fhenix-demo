import hre from 'hardhat'

async function main() {
  if (hre.network.name !== 'eth-sepolia') {
    throw new Error(`Expected eth-sepolia, received ${hre.network.name}.`)
  }

  const account = process.env.CHECK_ACCOUNT ?? '0x309deFCAAa3FB866C0bF099cB553ebc9f0b38575'
  const tokenAddress = process.env.CHECK_TOKEN ?? '0x4709e09bEADDA02461cDAa4A9Dd8274F410B2e4d'
  const token = await hre.ethers.getContractAt('VeilToken', tokenAddress)
  const [amount, ready] = await token.getDecryptBalanceResultSafe(account)

  console.log(
    JSON.stringify({
      account,
      token: tokenAddress,
      amount: amount.toString(),
      ready,
    }),
  )
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
