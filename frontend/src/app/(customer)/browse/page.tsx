'use client'

import { useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import { productService } from '../../../services/productService'
import { Product } from '../../../types/product'

export default function BrowsePage() {
  const router = useRouter()
  
  const [products, setProducts] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [sortBy, setSortBy] = useState<'name' | 'price' | ''>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(1)

  const categories = ['smartphones', 'laptops', 'tablets', 'mobile-accessories', 'smartwatches', 'audio']

  useEffect(() => {
    let isMounted = true;
    const fetchProducts = async () => {
      setLoading(true)
      try {
        const response = await productService.getProducts({
          search: search || undefined,
          category_id: category || undefined,
          sortBy: (sortBy as any) || undefined,
          sortOrder: sortBy ? sortOrder : undefined,
          page,
          limit: 12
        })
        if (isMounted) {
          setProducts(response.products)
          setTotal(response.total)
        }
      } catch (error) {
        console.error("Failed to load products:", error)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    const delayDebounceFn = setTimeout(() => {
      fetchProducts()
    }, 400)

    return () => {
      isMounted = false;
      clearTimeout(delayDebounceFn)
    }
  }, [search, category, sortBy, sortOrder, page])

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= Math.ceil(total / 12)) {
      setPage(newPage)
    }
  }

  return (
    <div style={{ minHeight: '100vh', backgroundColor: '#0d0d0d', color: '#e5e2e1', paddingBottom: '3rem' }}>

      {/* ── Progress bar ── */}
      <div style={{ position: 'fixed', top: '4rem', left: 0, right: 0, height: '3px', zIndex: 50, background: 'rgba(255,255,255,0.05)' }} />

      {/* ── Side nav ── */}
      <aside style={{
        position: 'fixed', left: '1.5rem', top: '50%', transform: 'translateY(-50%)',
        zIndex: 50, background: 'rgba(26,26,26,0.4)', backdropFilter: 'blur(40px)',
        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '40px',
        padding: '2.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '2.5rem', alignItems: 'center',
      }}>
        {([
          { icon: 'home',         label: 'Home',    path: '/',       active: false },
          { icon: 'inventory_2',  label: 'Product', path: '/browse', active: true  },
          { icon: 'shopping_bag', label: 'Cart',    path: '/cart',   active: false },
          { icon: 'receipt_long', label: 'Orders',  path: '/orders', active: false },
        ] as const).map(({ icon, label, path, active }) => (
          <button key={label} onClick={() => router.push(path)} title={label}
            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
            <span className="material-symbols-outlined" style={{
              fontSize: '22px',
              color: active ? '#2ff801' : '#a1a1a1',
              filter: active ? 'drop-shadow(0 0 8px rgba(47,248,1,0.6))' : undefined,
            }}>{icon}</span>
            <span style={{ fontSize: '8px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.3em', color: active ? '#2ff801' : '#a1a1a1' }}>
              {label}
            </span>
          </button>
        ))}
      </aside>

      {/* ── Main Content ── */}
      <main style={{
        paddingTop: '6rem',
        paddingLeft: '8rem', paddingRight: '2rem',
        maxWidth: '1440px', margin: '0 auto',
      }}>
        <div style={{ marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <h1 className="font-wide" style={{
            fontSize: '3rem', fontWeight: 900, textTransform: 'uppercase',
            letterSpacing: '0.2em', opacity: 0.9, textAlign: 'left',
          }}>
            Explore Products
          </h1>

          {/* ── Filter Controls ── */}
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: '1rem', 
            background: 'rgba(255,255,255,0.03)', padding: '1rem 1.5rem', 
            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)',
            alignItems: 'center'
          }}>
            
            <input 
              type="text" 
              placeholder="Search products..." 
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{
                flex: 1, minWidth: '200px', padding: '0.75rem 1rem',
                background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px', color: '#fff', outline: 'none'
              }}
            />

            <select 
              value={category} 
              onChange={(e) => { setCategory(e.target.value); setPage(1); }}
              style={{
                padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#fff', outline: 'none', cursor: 'pointer', minWidth: '150px'
              }}
            >
              <option value="">All Categories</option>
              {categories.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>)}
            </select>

            <select 
              value={sortBy} 
              onChange={(e) => { setSortBy(e.target.value as any); setPage(1); }}
              style={{
                padding: '0.75rem 1rem', background: 'rgba(0,0,0,0.5)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                color: '#fff', outline: 'none', cursor: 'pointer', minWidth: '150px'
              }}
            >
              <option value="">Sort By: Relevance</option>
              <option value="name">Sort By: Alphabetical</option>
              <option value="price">Sort By: Price</option>
            </select>

            {sortBy && (
              <button 
                onClick={() => { setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc'); setPage(1); }}
                style={{
                  padding: '0.75rem', background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px',
                  color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center'
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>
                  {sortOrder === 'asc' ? 'arrow_upward' : 'arrow_downward'}
                </span>
              </button>
            )}
          </div>
        </div>

        {/* ── Product Grid ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>Loading products...</div>
        ) : products.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '4rem', opacity: 0.5 }}>No products found matching your criteria.</div>
        ) : (
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '2rem'
          }}>
            {products.map(product => {
              const image = product.imageUrl || (product as any).image_url;
              const stock = product.stockQuantity ?? (product as any).stock_quantity;
              const categoryName = product.categoryId || (product as any).category_id;
              
              return (
              <div key={product.id} onClick={() => router.push(`/product/${product.id}`)} style={{
                background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '16px', overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s ease',
                display: 'flex', flexDirection: 'column'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-5px)';
                e.currentTarget.style.borderColor = 'rgba(47,248,1,0.3)';
                e.currentTarget.style.boxShadow = '0 10px 30px rgba(0,0,0,0.5)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'none';
                e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)';
                e.currentTarget.style.boxShadow = 'none';
              }}
              >
                <div style={{ height: '280px', background: '#000', position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {image ? (
                    <img src={image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: '1rem', transition: 'transform 0.3s ease' }} 
                         onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.05)'}
                         onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
                    />
                  ) : (
                    <div style={{ opacity: 0.2 }}>No Image</div>
                  )}
                  {stock < 10 && stock > 0 && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255, 100, 100, 0.2)', color: '#ff6666', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      Low Stock
                    </div>
                  )}
                  {stock === 0 && (
                    <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(255, 255, 255, 0.1)', color: '#999', padding: '4px 10px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' }}>
                      Out of Stock
                    </div>
                  )}
                </div>
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', flex: 1 }}>
                  <div style={{ fontSize: '12px', color: '#a1a1a1', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '0.5rem' }}>
                    {product.distributor || categoryName}
                  </div>
                  <h3 style={{ fontSize: '1.2rem', fontWeight: 600, marginBottom: '0.5rem', lineHeight: 1.3 }}>
                    {product.name}
                  </h3>
                  <div style={{ flex: 1, color: '#888', fontSize: '0.9rem', marginBottom: '1.5rem', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                    {product.description}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                    <span style={{ fontSize: '1.5rem', fontWeight: 700, color: '#fff' }}>${product.price.toFixed(2)}</span>
                    <button style={{ 
                      background: '#2ff801', color: '#000', border: 'none', 
                      width: '40px', height: '40px', borderRadius: '20px', 
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', opacity: stock === 0 ? 0.5 : 1
                    }}>
                      <span className="material-symbols-outlined" style={{ fontSize: '20px' }}>add_shopping_cart</span>
                    </button>
                  </div>
                </div>
              </div>
            )})}
          </div>
        )}

        {/* ── Pagination ── */}
        {total > 12 && !loading && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginTop: '3rem' }}>
            <button 
              onClick={() => handlePageChange(page - 1)} 
              disabled={page === 1}
              style={{
                padding: '0.5rem 1rem', background: page === 1 ? 'transparent' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: page === 1 ? '#555' : '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer'
              }}
            >
              Previous
            </button>
            <span style={{ color: '#a1a1a1', fontSize: '0.9rem' }}>
              Page {page} of {Math.ceil(total / 12)}
            </span>
            <button 
              onClick={() => handlePageChange(page + 1)} 
              disabled={page >= Math.ceil(total / 12)}
              style={{
                padding: '0.5rem 1rem', background: page >= Math.ceil(total / 12) ? 'transparent' : 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', color: page >= Math.ceil(total / 12) ? '#555' : '#fff', cursor: page >= Math.ceil(total / 12) ? 'not-allowed' : 'pointer'
              }}
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
