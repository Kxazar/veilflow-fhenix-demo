'use client'

import { useMemo, useState } from 'react'
import { useAccount, useWriteContract } from 'wagmi'

import { contracts, faucetAbi, isFaucetConfigured, marketAssets } from '@/lib/contracts'
import { demoAssets } from '@/lib/demo-data'

type FaucetItem = {
  id: string
  title: string
  amount: number
  faucetAddress: `0x${string}` | null
}

function describeError(error: { shortMessage?: string; message?: string } | null | undefined) {
  return error?.shortMessage ?? error?.message ?? 'Faucet transaction failed'
}

export function FaucetPanel() {
  const { address } = useAccount()
  const { writeContractAsync, isPending } = useWriteContract()

  const [selectedFaucetId, setSelectedFaucetId] = useState('VEIL')
  const [status, setStatus] = useState<string | null>(null)

  const faucets = useMemo<FaucetItem[]>(
    () => [
      {
        id: 'VEIL',
        title: 'VEIL',
        amount: 100,
        faucetAddress: isFaucetConfigured ? contracts.faucet : null,
      },
      ...demoAssets.map((asset, index) => ({
        id: asset.id,
        title: asset.name,
        amount: asset.faucetAmount,
        faucetAddress:
          marketAssets[index] && marketAssets[index].faucet !== '0x0000000000000000000000000000000000000000'
            ? marketAssets[index].faucet
            : null,
      })),
    ],
    [],
  )

  const selectedFaucet = faucets.find((item) => item.id === selectedFaucetId) ?? faucets[0]

  const handleClaim = async () => {
    if (!selectedFaucet.faucetAddress) {
      setStatus(`${selectedFaucet.title} faucet is wired in the UI, but its live contract address has not been configured yet.`)
      return
    }

    try {
      setStatus(`Submitting ${selectedFaucet.title} faucet claim...`)
      await writeContractAsync({
        address: selectedFaucet.faucetAddress,
        abi: faucetAbi,
        functionName: 'claim',
        args: [],
      })

      setStatus(`Claim sent. ${selectedFaucet.amount} ${selectedFaucet.title} can be claimed once every 24 hours per wallet.`)
    } catch (error) {
      setStatus(describeError(error as { shortMessage?: string; message?: string }))
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Protocol faucets</p>
          <h3>Bootstrap VEIL and market assets on-chain</h3>
        </div>
      </div>

      <div className="gauge-list">
        {faucets.map((faucet) => (
          <label className={`gauge-card ${selectedFaucetId === faucet.id ? 'gauge-card-active' : ''}`} key={faucet.id}>
            <input checked={selectedFaucetId === faucet.id} name="faucet" onChange={() => setSelectedFaucetId(faucet.id)} type="radio" />
            <div>
              <strong>{faucet.title}</strong>
              <p>{faucet.amount} tokens per claim</p>
              <span>one claim every 24 hours per wallet</span>
            </div>
          </label>
        ))}
      </div>

      <div className="metric-band">
        <div>
          <span className="muted">Selected asset</span>
          <strong>{selectedFaucet.title}</strong>
        </div>
        <div>
          <span className="muted">Per request</span>
          <strong>{selectedFaucet.amount}</strong>
        </div>
        <div>
          <span className="muted">Wallet status</span>
          <strong>{address ? 'ready to claim' : 'connect wallet first'}</strong>
        </div>
      </div>

      <div className="button-row">
        <button className="button" disabled={!address || isPending} onClick={() => void handleClaim()}>
          {isPending ? 'Pending...' : `Claim ${selectedFaucet.title}`}
        </button>
      </div>

      <p className="supporting-copy">
        VEIL and market faucets are rate-limited in the contracts themselves. That means the website cannot bypass the
        one-wallet-per-24-hour rule even if someone replays the UI.
      </p>

      {status ? <p className="supporting-copy">{status}</p> : null}
    </section>
  )
}
