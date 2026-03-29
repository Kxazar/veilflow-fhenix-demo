import type { Metadata } from 'next'
import { ReactNode } from 'react'

import { Providers } from '@/components/Providers'
import { brand } from '@/lib/brand'

import './globals.css'

export const metadata: Metadata = {
  title: brand.protocol,
  description: `${brand.protocol} is a confidential ve-tokenomics, swap, LP, and shielded stablecoin demo built on Fhenix CoFHE.`,
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
