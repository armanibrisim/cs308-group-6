import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-black text-white">
      <div className="z-10 max-w-5xl w-full items-center justify-center text-center space-y-8">
        <h1 className="text-6xl font-bold mb-6">Welcome to LUMEN</h1>
        <p className="text-xl mb-16">Your one-stop shop for consumer electronics and technology products</p>
        
        <div className="flex gap-12 justify-center">
          <Link 
            href="/login" 
            className="px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Login
          </Link>
          <Link 
            href="/register" 
            className="px-8 py-3 bg-white text-black font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Register
          </Link>
        </div>
      </div>
    </main>
  )
}