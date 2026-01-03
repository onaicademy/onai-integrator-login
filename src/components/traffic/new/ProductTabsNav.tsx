/**
 * Product Tabs Navigation
 * Навигация по вкладкам продуктов (Экспресс/Трехдневник/Однодневник)
 *
 * Tripwire Brand: черный фон + #00FF88 акценты
 */

import { ProductType } from '@/types/traffic-products.types';
import { PRODUCTS } from '@/lib/traffic-test-data';

interface ProductTabsNavProps {
  activeProduct: ProductType;
  onProductChange: (product: ProductType) => void;
  language: 'ru' | 'kz';
}

export function ProductTabsNav({ activeProduct, onProductChange, language }: ProductTabsNavProps) {
  const products: ProductType[] = ['express', 'challenge3d', 'intensive1d'];

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 mb-6">
      {products.map((productId) => {
        const product = PRODUCTS[productId];
        const isActive = activeProduct === productId;

        return (
          <button
            key={productId}
            onClick={() => onProductChange(productId)}
            className={`
              flex-1 px-6 py-4 rounded-2xl font-bold text-lg transition-all
              border-2 backdrop-blur-xl
              ${
                isActive
                  ? 'bg-gradient-to-r from-[#00FF88]/20 to-[#00FF88]/10 border-[#00FF88] text-white shadow-lg shadow-[#00FF88]/30'
                  : 'bg-black/60 border-gray-700 text-gray-400 hover:bg-gray-800/60 hover:border-gray-600'
              }
            `}
            style={{
              transform: isActive ? 'scale(1.02)' : 'scale(1)',
            }}
          >
            <div className="flex items-center justify-center gap-3">
              <span className="text-2xl">{product.icon}</span>
              <div>
                <div className="text-base sm:text-lg font-bold">
                  {language === 'ru' ? product.name : product.nameKz}
                </div>
                {product.price > 0 && (
                  <div className="text-xs text-gray-500 mt-0.5">
                    {language === 'ru' ? `$${product.price}` : `${product.priceKZT} ₸`}
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
