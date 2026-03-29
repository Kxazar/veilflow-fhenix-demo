'use client'

import { brand } from '@/lib/brand'
import { demoEpoch, demoGauges, demoPools } from '@/lib/demo-data'

const architectureSummary = [
  {
    title: `${brand.governanceTokenSymbol} source`,
    text: `A single on-chain faucet seeds ${brand.governanceTokenSymbol}, then the same token powers locks, wrapped balances, and weekly emissions.`,
  },
  {
    title: 'Pool engine',
    text: 'Each market is a live constant-product pool with direct swaps and LP minting, so the surface is not a static vote mockup.',
  },
  {
    title: 'Shadow settlement',
    text: 'Gauge votes stay encrypted during the epoch, then aggregate weights settle into real weekly NTRA emissions after reveal.',
  },
]

const architectureSteps = [
  {
    title: 'Faucet',
    text: `Bootstrap a wallet with ${brand.governanceTokenSymbol} so a new account can enter the loop immediately.`,
  },
  {
    title: 'Swap',
    text: 'Route into the active markets and build the inventory needed for the pool you want to support.',
  },
  {
    title: 'LP',
    text: 'Add liquidity on-chain and mint LP shares that will later compete for weekly emissions.',
  },
  {
    title: brand.veGovernanceTokenSymbol,
    text: `Lock ${brand.governanceTokenSymbol}, shape time-decaying voting power, and optionally wrap balances into the encrypted rail.`,
  },
  {
    title: 'Shadow Gauges',
    text: 'Encrypt pool choice locally, submit the hidden vote on-chain, and reveal aggregate weights only after epoch close.',
  },
]

export function ArchitecturePanel() {
  return (
    <section className="panel architecture-panel">
      <div className="panel-header architecture-header">
        <div>
          <p className="eyebrow">Architecture</p>
          <h3>{brand.protocol}: one compact loop from token source to hidden emissions</h3>
        </div>
        <p className="protocol-header-copy">
          {brand.protocol} is organized around a single readable cycle: seed {brand.governanceTokenSymbol}, route into
          pools, mint LP, lock into {brand.veGovernanceTokenSymbol}, and steer weekly emissions with encrypted gauge
          voting.
        </p>
      </div>

      <div className="architecture-summary">
        {architectureSummary.map((item) => (
          <article className="overview-card architecture-summary-card" key={item.title}>
            <span className="eyebrow">{item.title}</span>
            <p>{item.text}</p>
          </article>
        ))}
      </div>

      <div className="architecture-track">
        <div className="architecture-track-head">
          <div>
            <span className="eyebrow">Control flow</span>
            <strong>faucet -&gt; swap -&gt; LP -&gt; {brand.veGovernanceTokenSymbol} -&gt; shadow gauges</strong>
          </div>
          <p className="supporting-copy">
            The UI mirrors this order so the protocol reads as one continuous operating loop instead of scattered
            feature boxes.
          </p>
        </div>

        <div className="architecture-steps">
          {architectureSteps.map((item, index) => (
            <article className="architecture-step" key={item.title}>
              <span className="architecture-step-index">{String(index + 1).padStart(2, '0')}</span>
              <strong>{item.title}</strong>
              <p>{item.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="metric-band architecture-metrics">
        <div>
          <span className="muted">Active markets</span>
          <strong>{demoGauges.map((gauge) => gauge.name).join(' / ')}</strong>
        </div>
        <div>
          <span className="muted">Hidden votes this epoch</span>
          <strong>{demoEpoch.hiddenVotes} encrypted submissions</strong>
        </div>
        <div>
          <span className="muted">Weekly distribution</span>
          <strong>
            {demoEpoch.weeklyEmission} {brand.governanceTokenSymbol} across {demoPools.length} active lanes
          </strong>
        </div>
      </div>
    </section>
  )
}
