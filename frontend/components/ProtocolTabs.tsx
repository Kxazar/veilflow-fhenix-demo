'use client'

import { useState } from 'react'

import { FaucetPanel } from '@/components/FaucetPanel'
import { GaugeBoard } from '@/components/GaugeBoard'
import { LiquidityPanel } from '@/components/LiquidityPanel'
import { LockPlanner } from '@/components/LockPlanner'
import { SwapPanel } from '@/components/SwapPanel'
import { brand } from '@/lib/brand'

const tabs = [
  { id: 'faucet', label: 'Faucet' },
  { id: 'swap', label: 'Swap' },
  { id: 'lp', label: 'LP' },
  { id: 'governance', label: brand.veGovernanceTokenSymbol },
  { id: 'gauges', label: 'Shadow Gauges' },
] as const

type TabId = (typeof tabs)[number]['id']

const visibilityRows = [
  { label: 'Public to everyone', value: 'pool reserves, LP balances, emission budget, and active market inventory' },
  { label: 'Hidden until reveal', value: 'which gauge a voter selected and the per-gauge totals during the epoch' },
  {
    label: 'Only the holder can reveal',
    value: `wrapped ${brand.governanceTokenSymbol} balances and decrypted outputs tied to the holder permit`,
  },
]

export function ProtocolTabs() {
  const [activeTab, setActiveTab] = useState<TabId>('faucet')

  return (
    <section className="panel protocol-shell" id="protocol-workspace">
      <div className="panel-header protocol-header">
        <div>
          <p className="eyebrow">{brand.protocol} control surface</p>
          <h2>Every system rail gets its own lane</h2>
        </div>
        <p className="protocol-header-copy">
          Each tab isolates one user journey so onboarding, routing, LP formation, and ve-style governance stay clean
          and readable on the same screen.
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
        {activeTab === 'swap' ? <SwapPanel /> : null}
        {activeTab === 'lp' ? <LiquidityPanel /> : null}
        {activeTab === 'governance' ? <LockPlanner /> : null}
        {activeTab === 'gauges' ? <GaugeBoard /> : null}
      </div>
    </section>
  )
}
