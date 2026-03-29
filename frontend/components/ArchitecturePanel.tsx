import { protocolHighlights } from '@/lib/demo-data'

const architectureLayers = [
  {
    title: '1. veVEIL control layer',
    text: 'Public VEIL is locked into the gauge controller, producing linear time-decaying voting power. This creates the same strategic duration game that Curve and Aerodrome users know.',
  },
  {
    title: '2. confidential gauge layer',
    text: 'Users generate a CoFHE permit, encrypt the chosen gauge index locally, and submit a ciphertext handle. The contract then updates every gauge weight on each vote so observers cannot infer the selected pool from state transitions.',
  },
  {
    title: '3. shielded credit layer',
    text: 'Selected LP tokens enter the stable controller as transparent collateral, but the desired vhUSD mint amount, the resulting debt, and the user balance stay encrypted. The controller clips every request to the remaining 160% safe headroom.',
  },
]

const architectureFlows = [
  'Create a permit once, then reuse it to submit encrypted votes and later decrypt your own outputs.',
  'Wrap VEIL into the encrypted balance rail when the holder wants shielded treasury or position management.',
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
    <div className="architecture-stack">
      <div className="panel-header">
        <div>
          <p className="eyebrow">Protocol shape</p>
          <h3>How the protocol is wired end to end</h3>
        </div>
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
    </div>
  )
}
