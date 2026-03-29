'use client'

import { useState } from 'react'

import { ArchitecturePanel } from '@/components/ArchitecturePanel'
import { FaucetPanel } from '@/components/FaucetPanel'
import { GaugeBoard } from '@/components/GaugeBoard'
import { LockPlanner } from '@/components/LockPlanner'
import { StableMintPanel } from '@/components/StableMintPanel'

const tabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'faucet', label: 'Faucet' },
  { id: 'governance', label: 'veVEIL' },
  { id: 'gauges', label: 'Hidden Gauges' },
  { id: 'stable', label: 'vhUSD' },
  { id: 'architecture', label: 'Architecture' },
] as const

type TabId = (typeof tabs)[number]['id']

const overviewCards = [
  {
    title: 'wallet bootstrap',
    body: 'New users can claim 100 VEIL from the faucet once every 24 hours before entering the ve and gauge loop.',
  },
  {
    title: 've coordination',
    body: 'Lock VEIL to mint decaying governance weight, then tune the position with longer duration and larger notional.',
  },
  {
    title: 'hidden routing',
    body: 'Gauge choices are encrypted client-side before hitting the contract, so liquidity direction stays private until reveal.',
  },
  {
    title: 'shielded credit',
    body: 'Selected LP pairs back vhUSD. Users ask for a private mint amount, and the controller clips it to the safe 160% headroom.',
  },
]

const visibilityRows = [
  { label: 'Public to everyone', value: 'lock notional, approved LP deposits, emission budget, whitelisted pools' },
  { label: 'Hidden until reveal', value: 'which gauge a voter selected and the per-gauge totals during the epoch' },
  { label: 'Only the holder can reveal', value: 'wrapped VEIL balances, vhUSD balance, and vhUSD debt' },
]

export function ProtocolTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('overview')

  return (
    <section className="panel protocol-shell">
      <div className="panel-header protocol-header">
        <div>
          <p className="eyebrow">Protocol workspace</p>
          <h2>Split by function, not by contract file</h2>
        </div>
        <p className="protocol-header-copy">
          Each tab isolates one user journey so ve governance, hidden gauges, and shielded stablecoin actions do not
          compete for attention on the same screen.
        </p>
      </div>

      <div className="tab-row" role="tablist" aria-label="Protocol sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            aria-selected={activeTab === tab.id}
            className={`tab-button ${activeTab === tab.id ? 'tab-button-active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            role="tab"
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="tab-panel" role="tabpanel">
        {activeTab === 'overview' ? (
          <div className="overview-stack">
            <div className="overview-grid">
              {overviewCards.map((card) => (
                <article className="overview-card" key={card.title}>
                  <span className="eyebrow">{card.title}</span>
                  <p>{card.body}</p>
                </article>
              ))}
            </div>

            <div className="overview-band">
              <div>
                <span className="muted">Control plane</span>
                <strong>VEIL lockups and weekly emissions</strong>
              </div>
              <div>
                <span className="muted">Confidential plane</span>
                <strong>encrypted votes, balances, and debt handles</strong>
              </div>
              <div>
                <span className="muted">Credit plane</span>
                <strong>LP collateral feeding vhUSD mint capacity</strong>
              </div>
            </div>

            <div className="visibility-table">
              {visibilityRows.map((row) => (
                <article className="visibility-row" key={row.label}>
                  <strong>{row.label}</strong>
                  <p>{row.value}</p>
                </article>
              ))}
            </div>
          </div>
        ) : null}

        {activeTab === 'faucet' ? <FaucetPanel /> : null}
        {activeTab === 'governance' ? <LockPlanner /> : null}
        {activeTab === 'gauges' ? <GaugeBoard /> : null}
        {activeTab === 'stable' ? <StableMintPanel /> : null}
        {activeTab === 'architecture' ? <ArchitecturePanel /> : null}
      </div>
    </section>
  )
}
