import type { Metadata } from 'next'
import { ReactNode } from 'react'

import { Providers } from '@/components/Providers'

import './globals.css'

export const metadata: Metadata = {
  title: 'VeilFlow',
  description: 'Confidential ve-tokenomics and shielded LP-backed stablecoin demo built on Fhenix CoFHE.',
  icons: {
    icon: '/icon.svg',
    shortcut: '/icon.svg',
    apple: '/icon.svg',
  },
}

type RootLayoutProps = {
  children: ReactNode
}

export default function RootLayout({ children }: RootLayoutProps) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
