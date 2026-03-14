import Link from 'next/link'

export const Header = () => {
  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-blue-600">
              LUMEN
            </Link>
          </div>
          
          <nav className="hidden md:flex space-x-8">
            <Link href="/browse" className="text-gray-700 hover:text-blue-600">
              Browse
            </Link>
            <Link href="/cart" className="text-gray-700 hover:text-blue-600">
              Cart
            </Link>
            <Link href="/orders" className="text-gray-700 hover:text-blue-600">
              Orders
            </Link>
          </nav>
          
          <div className="flex items-center space-x-4">
            <Link href="/login" className="text-gray-700 hover:text-blue-600">
              Login
            </Link>
            <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              Register
            </Link>
          </div>
        </div>
      </div>
    </header>
  )
}