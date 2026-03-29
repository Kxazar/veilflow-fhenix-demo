import { LogoMark } from '@/components/LogoMark'
import { ModeStatus } from '@/components/ModeStatus'
import { ProtocolTabs } from '@/components/ProtocolTabs'
import { WalletPanel } from '@/components/WalletPanel'
import { ArchitecturePanel } from '@/components/ArchitecturePanel'
import { brand } from '@/lib/brand'
import { demoEpoch, demoStablePosition } from '@/lib/demo-data'

const heroStats = [
  {
    label: 'Encrypted votes this epoch',
    value: String(demoEpoch.hiddenVotes),
  },
  {
    label: `Weekly ${brand.governanceTokenSymbol} emissions`,
    value: `${demoEpoch.weeklyEmission}`,
  },
  {
    label: `${brand.stableTokenSymbol} mint ceiling`,
    value: `${demoStablePosition.maxMintableAt160}`,
  },
]

const heroTags = [
  'Confidential gauge routing',
  'Active swap and LP markets',
  'LP-backed private credit',
]

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="brand-bar">
        <div className="brand-lockup">
          <LogoMark className="brand-logo" />
          <div className="brand-meta">
            <p className="eyebrow">{brand.descriptor}</p>
            <h2 className="brand-title">{brand.protocol}</h2>
          </div>
        </div>
        <div className="brand-links">
          <span className="brand-pill">ve-style emissions</span>
          <span className="brand-pill">shadow gauges</span>
          <span className="brand-pill">{brand.stableTokenSymbol} rail</span>
        </div>
      </section>

      <section className="hero">
        <div className="hero-copy">
          <div className="hero-frame">
            <p className="eyebrow">{brand.short}</p>
            <h1>Shadow liquidity, loud market presence.</h1>
            <p className="hero-text">
              {brand.protocol} is a Fhenix-native protocol surface for encrypted gauge voting, active LP formation, and
              private stablecoin credit. It brings Curve and Aerodrome style coordination into a darker, more tactical
              interface language.
            </p>

            <div className="hero-actions">
              <a className="hero-action" href="#protocol-workspace">
                Enter control surface
              </a>
              <p className="hero-note">
                {brand.governanceTokenSymbol} governs emissions, {brand.veGovernanceTokenSymbol} decays over time, and{' '}
                {brand.stableTokenSymbol} stays private until the holder reveals it.
              </p>
            </div>

            <div className="hero-tags">
              {heroTags.map((tag) => (
                <span className="hero-tag" key={tag}>
                  {tag}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="hero-stats">
          <article className="spotlight-card">
            <div className="spotlight-header">
              <span className="eyebrow">Market signal</span>
              <span className="brand-badge">Built on Fhenix CoFHE</span>
            </div>
            <div className="spotlight-values">
              <strong>{brand.protocol}</strong>
              <p>
                A confidential liquidity stack with live pool mechanics, epoch settlement, and private debt state in a
                single surface.
              </p>
            </div>
          </article>

          {heroStats.map((stat) => (
            <article className="stat-card" key={stat.label}>
              <span>{stat.label}</span>
              <strong>{stat.value}</strong>
            </article>
          ))}
        </div>
      </section>

      <ArchitecturePanel />

      <section className="content-grid">
        <div className="stack">
          <ProtocolTabs />
        </div>

        <div className="stack stack-side">
          <ModeStatus />
          <WalletPanel />
        </div>
      </section>
    </main>
  )
}
