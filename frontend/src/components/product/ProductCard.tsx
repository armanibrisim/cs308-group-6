import Image from 'next/image'
import { Button } from '../ui/Button'

interface ProductCardProps {
  id: string
  name: string
  price: number
  image?: string
  description?: string
  inStock: boolean
}

export const ProductCard: React.FC<ProductCardProps> = ({
  id,
  name,
  price,
  image,
  description,
  inStock
}) => {
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      <div className="aspect-w-1 aspect-h-1 w-full">
        {image ? (
          <Image
            src={image}
            alt={name}
            width={300}
            height={300}
            className="w-full h-48 object-cover"
          />
        ) : (
          <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
            <span className="text-gray-500">No Image</span>
          </div>
        )}
      </div>
      
      <div className="p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{name}</h3>
        {description && (
          <p className="text-gray-600 text-sm mb-3 line-clamp-2">{description}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xl font-bold text-blue-600">${price}</span>
          <Button 
            size="sm" 
            disabled={!inStock}
            className={!inStock ? 'opacity-50 cursor-not-allowed' : ''}
          >
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </Button>
        </div>
      </div>
    </div>
  )
}