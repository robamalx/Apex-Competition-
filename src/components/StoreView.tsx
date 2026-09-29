import React, { useState, useEffect } from 'react';
import { ShoppingBag, Tag, CheckCircle2, AlertCircle, Sparkles, Trophy } from 'lucide-react';
import { StoreProduct, StoreOrder } from '../types';
import { useAuth } from '../context/AuthContext';
import { AdPlacementBanner } from './AdPlacementBanner';

export const StoreView: React.FC = () => {
  const { user, token, refreshUserData } = useAuth();
  const [products, setProducts] = useState<StoreProduct[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [orderingId, setOrderingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchProducts = async () => {
    try {
      const res = await fetch('/api/store/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (err) {
      console.error('Failed to fetch store products', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOrder = async (productId: string, paymentType: 'ETB' | 'POINTS') => {
    setFeedback(null);
    if (!token || !user) {
      setFeedback({ type: 'error', message: 'Please log in to place store orders.' });
      return;
    }

    setOrderingId(productId);
    try {
      const res = await fetch('/api/store/order', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ productId, paymentType })
      });

      const data = await res.json();
      if (!res.ok) {
        setFeedback({ type: 'error', message: data.error || 'Order failed' });
      } else {
        setFeedback({
          type: 'success',
          message: `Order for ${data.order?.productTitle} placed successfully!`
        });
        await refreshUserData();
        await fetchProducts();
      }
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Order error' });
    } finally {
      setOrderingId(null);
    }
  };

  const categories = ['ALL', 'MERCH', 'PREDICTION_BOOSTER', 'VIP_PASS', 'FAN_GEAR'];
  const filteredProducts = products.filter(
    p => selectedCategory === 'ALL' || p.category === selectedCategory
  );

  return (
    <div className="space-y-6 pb-20">
      
      {/* Header */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
            <ShoppingBag className="w-6 h-6 text-cyan-400" />
            APEX FAN STORE & BOOSTERS
          </h2>
          <p className="text-xs text-slate-300 mt-1">
            Redeem official gear and prediction multiplier boosters using ETB or Referral Points!
          </p>
        </div>

        {user && (
          <div className="flex items-center gap-3 text-xs font-bold">
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-emerald-400">
              {user.balanceETB} ETB
            </div>
            <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-amber-400">
              {user.referralPoints} PTS
            </div>
          </div>
        )}
      </div>

      {/* Official Store Advertising / Sponsorship Banner */}
      <AdPlacementBanner placement="STORE_BANNER" />

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        {categories.map(cat => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-colors ${
              selectedCategory === cat
                ? 'bg-cyan-500 text-slate-950 font-black'
                : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            {(cat || '').replace('_', ' ')}
          </button>
        ))}
      </div>

      {feedback && (
        <div
          className={`p-4 rounded-xl text-xs font-bold flex items-center gap-2 ${
            feedback.type === 'success'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
          }`}
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-5 h-5 shrink-0 text-rose-400" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* PRODUCTS GRID */}
      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">
          Loading store catalog...
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(prod => (
            <div
              key={prod.id}
              className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <img
                  src={prod.imageUrl}
                  alt={prod.title}
                  className="w-full h-44 object-cover"
                />

                <div className="p-5 space-y-2">
                  <span className="px-2.5 py-1 rounded bg-cyan-500/10 text-cyan-400 font-extrabold text-[10px] uppercase border border-cyan-500/20">
                    {(prod.category || '').replace('_', ' ')}
                  </span>
                  <h4 className="font-extrabold text-base text-white uppercase">{prod.title}</h4>
                  <p className="text-xs text-slate-400 line-clamp-2">{prod.description}</p>
                </div>
              </div>

              <div className="p-5 pt-0 space-y-3">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs font-bold">
                  <span className="text-emerald-400">{prod.priceETB} ETB</span>
                  <span className="text-slate-500">OR</span>
                  <span className="text-amber-400">{prod.pricePoints} PTS</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleOrder(prod.id, 'ETB')}
                    disabled={orderingId === prod.id}
                    className="py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all"
                  >
                    Buy (ETB)
                  </button>

                  <button
                    onClick={() => handleOrder(prod.id, 'POINTS')}
                    disabled={orderingId === prod.id}
                    className="py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all"
                  >
                    Redeem (PTS)
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
