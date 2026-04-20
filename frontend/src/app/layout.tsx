import type { Metadata } from 'next'
import { AuthProvider } from '../context/AuthContext'
import { CategoryProvider } from '../context/CategoryContext'
import { Navbar } from '../components/layout/Navbar'
import './globals.css'

export const metadata: Metadata = {
  title: 'LUMEN - Online Tech Store',
  description: 'Your one-stop shop for consumer electronics and technology products',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
        <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body>
        <AuthProvider>
          <CategoryProvider>
            <Navbar />
            <div style={{ paddingTop: '8rem' }}>{children}</div>
          </CategoryProvider>
        </AuthProvider>
      </body>
    </html>
  )
}
