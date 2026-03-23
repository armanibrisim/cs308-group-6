import Link from 'next/link'

export default function Home() {
  return (
    <main
      style={{
        minHeight: '100vh',
        backgroundColor: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      <h1
        style={{
          fontSize: '72px',
          fontWeight: 700,
          marginBottom: '24px',
          color: '#111111',
        }}
      >
        Welcome to LUMEN
      </h1>

      <p
        style={{
          fontSize: '28px',
          color: '#444444',
          marginBottom: '48px',
          maxWidth: '1000px',
        }}
      >
        Your one-stop shop for consumer electronics and technology products
      </p>

      <div
        style={{
          display: 'flex',
          gap: '24px',
          justifyContent: 'center',
          alignItems: 'center',
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/login"
          style={{
            display: 'inline-block',
            minWidth: '220px',
            padding: '16px 32px',
            backgroundColor: '#111111',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '18px',
            fontSize: '22px',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Login
        </Link>

        <Link
          href="/register"
          style={{
            display: 'inline-block',
            minWidth: '220px',
            padding: '16px 32px',
            backgroundColor: '#111111',
            color: '#ffffff',
            textDecoration: 'none',
            borderRadius: '18px',
            fontSize: '22px',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Register
        </Link>
      </div>
    </main>
  )
}