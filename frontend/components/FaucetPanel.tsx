'use client'

import { useEffect, useState } from 'react'
import { useAccount, usePublicClient, useWriteContract } from 'wagmi'

import { contracts, erc20Abi, faucetAbi, isFaucetConfigured } from '@/lib/contracts'

function describeError(error: { shortMessage?: string; message?: string } | null | undefined) {
  return error?.shortMessage ?? error?.message ?? 'Faucet transaction failed'
}

function formatTimestamp(timestamp: bigint | null) {
  if (!timestamp || timestamp === BigInt(0)) {
    return 'available now'
  }

  return new Date(Number(timestamp) * 1000).toLocaleString()
}

export function FaucetPanel() {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { writeContractAsync, isPending } = useWriteContract()

  const [faucetBalance, setFaucetBalance] = useState<string>('1000')
  const [canClaim, setCanClaim] = useState<boolean>(true)
  const [nextClaimAt, setNextClaimAt] = useState<bigint | null>(BigInt(0))
  const [status, setStatus] = useState<string | null>(null)

  useEffect(() => {
    if (!publicClient || !address || !isFaucetConfigured) {
      return
    }

    let cancelled = false

    const load = async () => {
      const [balance, eligible, nextClaim] = await Promise.all([
        publicClient.readContract({
          address: contracts.voteToken,
          abi: erc20Abi,
          functionName: 'balanceOf',
          args: [contracts.faucet],
        }),
        publicClient.readContract({
          address: contracts.faucet,
          abi: faucetAbi,
          functionName: 'canClaim',
          args: [address],
        }),
        publicClient.readContract({
          address: contracts.faucet,
          abi: faucetAbi,
          functionName: 'getNextClaimAt',
          args: [address],
        }),
      ])

      if (!cancelled) {
        setFaucetBalance(balance.toString())
        setCanClaim(eligible)
        setNextClaimAt(nextClaim)
      }
    }

    void load()

    return () => {
      cancelled = true
    }
  }, [address, publicClient])

  const handleClaim = async () => {
    if (!isFaucetConfigured) {
      setStatus('The faucet tab is wired, but the live faucet address has not been configured yet.')
      return
    }

    try {
      setStatus('Submitting VEIL faucet claim...')

      await writeContractAsync({
        address: contracts.faucet,
        abi: faucetAbi,
        functionName: 'claim',
        args: [],
      })

      setStatus('Claim sent. You can request 100 VEIL once every 24 hours per wallet.')
    } catch (error) {
      setStatus(describeError(error as { shortMessage?: string; message?: string }))
    }
  }

  return (
    <section className="panel">
      <div className="panel-header">
        <div>
          <p className="eyebrow">VEIL faucet</p>
          <h3>On-chain onboarding rail for new wallets</h3>
        </div>
      </div>

      <div className="metric-band">
        <div>
          <span className="muted">Per request</span>
          <strong>100 VEIL</strong>
        </div>
        <div>
          <span className="muted">Cooldown</span>
          <strong>24 hours</strong>
        </div>
        <div>
          <span className="muted">Faucet balance</span>
          <strong>{faucetBalance} VEIL</strong>
        </div>
      </div>

      <div className="visibility-table">
        <article className="visibility-row">
          <strong>Wallet status</strong>
          <p>{address ? (canClaim ? 'eligible for claim' : `next claim: ${formatTimestamp(nextClaimAt)}`) : 'connect a wallet to check eligibility'}</p>
        </article>
      </div>

      <div className="button-row">
        <button className="button" disabled={!address || !canClaim || isPending} onClick={() => void handleClaim()}>
          {isPending ? 'Pending...' : 'Claim 100 VEIL'}
        </button>
      </div>

      <p className="supporting-copy">
        The faucet rate limit is enforced on-chain, so the website cannot bypass it. Each wallet can make one claim per
        rolling 24 hour window.
      </p>

      {status ? <p className="supporting-copy">{status}</p> : null}
    </section>
  )
}
