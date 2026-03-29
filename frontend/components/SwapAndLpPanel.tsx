'use client'

import { useMemo, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'

import { brand } from '@/lib/brand'
import { areAssetsConfigured, arePoolsConfigured, erc20Abi, liquidityPools, marketAssets, poolAbi } from '@/lib/contracts'
import { demoAssets, demoPools } from '@/lib/demo-data'

function describeError(error: { shortMessage?: string; message?: string } | null | undefined) {
  return error?.shortMessage ?? error?.message ?? 'Pool transaction failed'
}

export function SwapAndLpPanel() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()

  const [selectedPoolId, setSelectedPoolId] = useState(0)
  const [liquidityAmount0, setLiquidityAmount0] = useState(50)
  const [liquidityAmount1, setLiquidityAmount1] = useState(50)
  const [swapAmount, setSwapAmount] = useState(10)
  const [quotedAmountOut, setQuotedAmountOut] = useState<string | null>('11')
  const [status, setStatus] = useState<string | null>(null)

  const selectedPool = useMemo(() => demoPools.find((pool) => pool.id === selectedPoolId) ?? demoPools[0], [selectedPoolId])
  const tokenIn = useMemo(() => demoAssets.find((asset) => asset.id === selectedPool.tokenIn) ?? demoAssets[0], [selectedPool])
  const tokenOut = useMemo(() => demoAssets.find((asset) => asset.id === selectedPool.tokenOut) ?? demoAssets[1], [selectedPool])

  const livePool = liquidityPools.find((pool) => pool.id === selectedPoolId)
  const liveTokenIn = marketAssets.find((asset) => asset.id === selectedPool.tokenIn)
  const liveTokenOut = marketAssets.find((asset) => asset.id === selectedPool.tokenOut)

  const handleQuote = async () => {
    if (!publicClient || !livePool || !liveTokenIn || !arePoolsConfigured) {
      setQuotedAmountOut(String(Math.max(1, swapAmount - 1)))
      setStatus('Showing a demo quote. Live routing will activate once pool addresses are configured.')
      return
    }

    try {
      const amountOut = await publicClient.readContract({
        address: livePool.address,
        abi: poolAbi,
        functionName: 'getAmountOut',
        args: [liveTokenIn.address, BigInt(swapAmount)],
      })
      setQuotedAmountOut(amountOut.toString())
      setStatus('Live quote loaded from the selected pool.')
    } catch (error) {
      setStatus(describeError(error as { shortMessage?: string; message?: string }))
    }
  }

  const handleAddLiquidity = async () => {
    if (!address || !livePool || !liveTokenIn || !liveTokenOut || !arePoolsConfigured || !areAssetsConfigured) {
      setStatus('Pool addresses are not live yet, so the LP tab stays in preview mode.')
      return
    }

    try {
      setStatus(`Approving ${tokenIn.name} for the pool...`)
      await writeContractAsync({
        address: liveTokenIn.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [livePool.address, BigInt(liquidityAmount0)],
      })

      setStatus(`Approving ${tokenOut.name} for the pool...`)
      await writeContractAsync({
        address: liveTokenOut.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [livePool.address, BigInt(liquidityAmount1)],
      })

      setStatus('Submitting add liquidity transaction...')
      await writeContractAsync({
        address: livePool.address,
        abi: poolAbi,
        functionName: 'addLiquidity',
        args: [BigInt(liquidityAmount0), BigInt(liquidityAmount1)],
      })

      setStatus(`Liquidity added. The resulting LP token can be used as collateral in ${brand.stableTokenSymbol} markets if the pair is whitelisted.`)
    } catch (error) {
      setStatus(describeError(error as { shortMessage?: string; message?: string }))
    }
  }

  const handleSwap = async () => {
    if (!address || !livePool || !liveTokenIn || !arePoolsConfigured || !areAssetsConfigured) {
      setStatus('Swap routing is ready in the UI, but live pool addresses are not configured yet.')
      return
    }

    try {
      setStatus(`Approving ${tokenIn.name} for the swap...`)
      await writeContractAsync({
        address: liveTokenIn.address,
        abi: erc20Abi,
        functionName: 'approve',
        args: [livePool.address, BigInt(swapAmount)],
      })

      setStatus('Submitting swap transaction...')
      await writeContractAsync({
        address: livePool.address,
        abi: poolAbi,
        functionName: 'swap',
        args: [liveTokenIn.address, BigInt(swapAmount), BigInt(quotedAmountOut ?? '1')],
      })

      setStatus('Swap submitted successfully.')
    } catch (error) {
      setStatus(describeError(error as { shortMessage?: string; message?: string }))
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Swap & LP</p>
          <h3>Route into the pools, then mint LP as collateral inventory</h3>
        </div>
      </div>

      <div className="gauge-list">
        {demoPools.map((pool) => (
          <label className={`gauge-card ${selectedPoolId === pool.id ? 'gauge-card-active' : ''}`} key={pool.id}>
            <input checked={selectedPoolId === pool.id} name="pool" onChange={() => setSelectedPoolId(pool.id)} type="radio" />
            <div>
              <strong>{pool.name}</strong>
              <p>{pool.symbol}</p>
              <span>
                reserves {pool.reserve0} / {pool.reserve1}
              </span>
            </div>
            <div className="gauge-metrics">
              <span>{pool.userLpBalance} LP held</span>
              <span>{pool.rewardInventory} {brand.governanceTokenSymbol} epoch flow</span>
            </div>
          </label>
        ))}
      </div>

      <div className="toolbar toolbar-triple">
        <label className="field field-inline">
          <span>{tokenIn.name} for LP</span>
          <input className="input input-compact" min={1} onChange={(e) => setLiquidityAmount0(Number(e.target.value))} type="number" value={liquidityAmount0} />
        </label>
        <label className="field field-inline">
          <span>{tokenOut.name} for LP</span>
          <input className="input input-compact" min={1} onChange={(e) => setLiquidityAmount1(Number(e.target.value))} type="number" value={liquidityAmount1} />
        </label>
        <label className="field field-inline">
          <span>{tokenIn.name} to swap</span>
          <input className="input input-compact" min={1} onChange={(e) => setSwapAmount(Number(e.target.value))} type="number" value={swapAmount} />
        </label>
      </div>

      <div className="button-row">
        <button className="button button-secondary" onClick={() => void handleQuote()}>
          Quote swap
        </button>
        <button className="button" disabled={isPending} onClick={() => void handleAddLiquidity()}>
          {isPending ? 'Pending...' : 'Add liquidity'}
        </button>
        <button className="button button-secondary" disabled={isPending} onClick={() => void handleSwap()}>
          Swap assets
        </button>
      </div>

      <div className="metric-band">
        <div>
          <span className="muted">Route</span>
          <strong>
            {tokenIn.name} -&gt; {tokenOut.name}
          </strong>
        </div>
        <div>
          <span className="muted">Quote</span>
          <strong>{quotedAmountOut ?? 'hidden'} out</strong>
        </div>
        <div>
          <span className="muted">Collateral path</span>
          <strong>{selectedPool.symbol} feeds {brand.stableTokenSymbol}</strong>
        </div>
      </div>

      <p className="supporting-copy">
        Pools are standard constant-product markets in this demo. After adding liquidity, the minted LP token becomes a
        candidate input for the stable controller if the pair has been whitelisted.
      </p>

      {status ? <p className="supporting-copy">{status}</p> : null}
    </section>
  )
}
