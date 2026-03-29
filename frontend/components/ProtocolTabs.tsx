'use client'

import { useState } from 'react'

import { FaucetPanel } from '@/components/FaucetPanel'
import { GaugeBoard } from '@/components/GaugeBoard'
import { LockPlanner } from '@/components/LockPlanner'
import { StableMintPanel } from '@/components/StableMintPanel'
import { SwapAndLpPanel } from '@/components/SwapAndLpPanel'

const tabs = [
  { id: 'faucet', label: 'Faucet' },
  { id: 'governance', label: 'veVEIL' },
  { id: 'gauges', label: 'Hidden Gauges' },
  { id: 'pools', label: 'Swap & LP' },
  { id: 'stable', label: 'vhUSD' },
] as const

type TabId = (typeof tabs)[number]['id']

const visibilityRows = [
  { label: 'Public to everyone', value: 'lock notional, approved LP deposits, emission budget, whitelisted pools' },
  { label: 'Hidden until reveal', value: 'which gauge a voter selected and the per-gauge totals during the epoch' },
  { label: 'Only the holder can reveal', value: 'wrapped VEIL balances, vhUSD balance, and vhUSD debt' },
]

export function ProtocolTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('faucet')

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
        <div className="overview-stack">
          <div className="visibility-table">
            {visibilityRows.map((row) => (
              <article className="visibility-row" key={row.label}>
                <strong>{row.label}</strong>
                <p>{row.value}</p>
              </article>
            ))}
          </div>
        </div>

        {activeTab === 'faucet' ? <FaucetPanel /> : null}
        {activeTab === 'governance' ? <LockPlanner /> : null}
        {activeTab === 'gauges' ? <GaugeBoard /> : null}
        {activeTab === 'pools' ? <SwapAndLpPanel /> : null}
        {activeTab === 'stable' ? <StableMintPanel /> : null}
      </div>
    </section>
  )
}
