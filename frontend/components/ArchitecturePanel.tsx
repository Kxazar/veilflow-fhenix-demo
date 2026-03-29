'use client'

import { brand } from '@/lib/brand'
import { demoGauges, demoPools, protocolHighlights } from '@/lib/demo-data'

const architectureLayers = [
  {
    title: `1. ${brand.veGovernanceTokenSymbol} control layer`,
    text: `${brand.governanceTokenSymbol} is locked into the gauge controller to produce linear time-decaying voting power. This keeps the same strategic duration game that Curve and Aerodrome users know, but frames it inside a more tactical credit stack.`,
  },
  {
    title: '2. confidential gauge layer',
    text: 'Users generate a CoFHE permit, encrypt the chosen gauge index locally, and submit a ciphertext handle. The contract then updates every gauge weight on each vote so observers cannot infer the selected pool from state transitions.',
  },
  {
    title: '3. shielded credit layer',
    text: `Selected LP tokens enter the stable controller as transparent collateral, but the desired ${brand.stableTokenSymbol} mint amount, the resulting debt, and the user balance stay encrypted. The controller clips every request to the remaining 160% safe headroom.`,
  },
]

const architectureFlows = [
  'Create a permit once, then reuse it to submit encrypted votes and later decrypt your own outputs.',
  `Wrap ${brand.governanceTokenSymbol} into the encrypted balance rail when the holder wants shielded treasury or position management.`,
  'Reveal epoch weights only after the voting window closes, preserving price discovery until emissions are set.',
  'Let users discover mint capacity from LP collateral without broadcasting the exact size of their debt.',
]

const referenceRepos = [
  {
    label: 'marronjo/fhe-hook-template',
    href: 'https://github.com/marronjo/fhe-hook-template',
  },
  {
    label: 'FhenixProtocol/poc-shielded-stablecoin',
    href: 'https://github.com/FhenixProtocol/poc-shielded-stablecoin',
  },
  {
    label: 'FhenixProtocol/encrypted-secret-santa',
    href: 'https://github.com/FhenixProtocol/encrypted-secret-santa',
  },
]

export function ArchitecturePanel() {
  return (
    <section className="panel architecture-top">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Architecture</p>
          <h3>{brand.protocol}: governance, liquidity, and private credit in one surface</h3>
        </div>
        <p className="protocol-header-copy">
          {brand.protocol} combines an emissions game, actual swap and LP primitives, and a shielded stablecoin path that turns
          selected LP positions into confidential credit.
        </p>
      </div>

      <div className="overview-grid">
        <article className="overview-card">
          <span className="eyebrow">governance rail</span>
          <p>
            Users claim {brand.governanceTokenSymbol}, lock it into {brand.veGovernanceTokenSymbol}, and steer weekly emissions with encrypted gauge selection.
          </p>
        </article>
        <article className="overview-card">
          <span className="eyebrow">liquidity rail</span>
          <p>
            Supported pools are not placeholders: they price swaps, mint LP, and receive real {brand.governanceTokenSymbol} emissions after settlement.
          </p>
        </article>
        <article className="overview-card">
          <span className="eyebrow">private credit rail</span>
          <p>
            LP collateral remains public, while requested {brand.stableTokenSymbol} mint size, resulting debt, and shielded balances stay encrypted.
          </p>
        </article>
        <article className="overview-card">
          <span className="eyebrow">epoch settlement</span>
          <p>
            The controller reveals aggregate weights, settles {brand.governanceTokenSymbol} with a floor for each active gauge, and pushes rewards on-chain.
          </p>
        </article>
      </div>

      <div className="architecture-grid">
        {architectureLayers.map((item) => (
          <article className="architecture-card" key={item.title}>
            <strong>{item.title}</strong>
            <p>{item.text}</p>
          </article>
        ))}

        {protocolHighlights.map((item) => (
          <article className="architecture-card" key={item}>
            <p>{item}</p>
          </article>
        ))}
      </div>

      <div className="overview-band">
        <div>
          <span className="muted">Active markets</span>
          <strong>{demoGauges.map((gauge) => gauge.name).join(' / ')}</strong>
        </div>
        <div>
          <span className="muted">LP path</span>
          <strong>{demoPools.map((pool) => `${pool.symbol}: ${pool.userLpBalance}`).join(' / ')}</strong>
        </div>
        <div>
          <span className="muted">Emission model</span>
          <strong>{`every active gauge keeps a non-zero ${brand.governanceTokenSymbol} weekly flow`}</strong>
        </div>
      </div>

      <div className="flow-list">
        {architectureFlows.map((item) => (
          <article className="flow-card" key={item}>
            <p>{item}</p>
          </article>
        ))}
      </div>

      <div className="reference-strip">
        {referenceRepos.map((repo) => (
          <a className="reference-link" href={repo.href} key={repo.href} rel="noreferrer" target="_blank">
            {repo.label}
          </a>
        ))}
      </div>
    </section>
  )
}
