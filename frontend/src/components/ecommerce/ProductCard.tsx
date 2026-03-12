// ProductCard — presentational only, no React import required with new JSX transform
import { Product } from '../../pages/Admin/Products/Product.interface'

type Props = {
  product: Product
  className?: string
}

export default function ProductCard({ product, className = '' }: Props) {
  const initials = (product.name || '')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  return (
    <article
      tabIndex={0}
      className={`group rounded-2xl border border-gray-200 bg-white shadow-sm transform transition duration-150 ease-out hover:shadow-lg hover:scale-105 motion-reduce:transform-none motion-reduce:transition-none overflow-hidden dark:border-gray-800 dark:bg-white/[0.03] ${className}`}
      role="article"
    >
      <div className="h-44 w-full overflow-hidden rounded-t-2xl bg-gray-100">
        {product.coverImage ? (
          <img
            src={product.coverImage}
            alt={product.name}
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full items-center justify-center bg-brand-100 text-brand-700 transition-colors duration-150 group-hover:bg-brand-200 dark:group-hover:bg-brand-500/20">
            <span className="text-lg font-semibold">{initials || 'P'}</span>
          </div>
        )}
      </div>

      <div className="p-4">
        <h4 className="text-sm font-semibold text-gray-800 dark:text-white/90 transition-colors duration-150 group-hover:text-brand-600 dark:group-hover:text-brand-400">
          {product.name}
        </h4>
        <p
          className="mt-2 text-sm text-gray-500 dark:text-gray-400 transition-colors duration-150 group-hover:text-gray-700 dark:group-hover:text-white/90"
          style={{
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          }}
        >
          {product.description ?? ''}
        </p>
      </div>
    </article>
  )
}
