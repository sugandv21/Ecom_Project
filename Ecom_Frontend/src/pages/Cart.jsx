import React, { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";

export default function Cart() {
  const [cart, setCart] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("cart") || "[]");
    } catch {
      return [];
    }
  });
  const [loadingImages, setLoadingImages] = useState(false);
  const navigate = useNavigate();

  const API_ROOT = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/api\/v1\/?$/, "");

  useEffect(() => {
    let mounted = true;
    const itemsNeedingFetch = cart
      .map((it, idx) => ({ ...it, _idx: idx }))
      .filter((it) => !it.image && !it.image_url && it.product_id);

    if (itemsNeedingFetch.length === 0) return;

    setLoadingImages(true);

    (async () => {
      try {
        const updated = [...cart];
        await Promise.all(
          itemsNeedingFetch.map(async (it) => {
            try {
              const res = await axiosClient.get(`/products/${it.product_id}/`);
              if (!mounted) return;
              const product = res.data || {};
              const imageUrl =
                product.image_url ||
                (product.image ? `${API_ROOT}${product.image.startsWith("/") ? "" : "/"}${product.image}` : null);
              updated[it._idx] = {
                ...updated[it._idx],
                image: product.image || updated[it._idx].image,
                image_url: imageUrl || updated[it._idx].image_url,
              };
            } catch (e) {
              console.warn("Failed to fetch product for cart image:", it.product_id, e);
            }
          })
        );
        if (!mounted) return;
        setCart(updated);
        localStorage.setItem("cart", JSON.stringify(updated));
      } finally {
        if (mounted) setLoadingImages(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const persist = (newCart) => {
    setCart(newCart);
    localStorage.setItem("cart", JSON.stringify(newCart));
  };

  const increment = (idx) => {
    const newCart = [...cart];
    newCart[idx].quantity += 1;
    persist(newCart);
  };

  const decrement = (idx) => {
    const newCart = [...cart];
    if (newCart[idx].quantity > 1) {
      newCart[idx].quantity -= 1;
      persist(newCart);
    }
  };

  const removeItem = (idx) => {
    const newCart = cart.filter((_, i) => i !== idx);
    persist(newCart);
  };

  const subtotal = cart.reduce((s, i) => s + Number(i.price || 0) * Number(i.quantity || 0), 0);

  const imageFor = (item) => {
    if (item.image_url) return item.image_url;
    if (item.image) return item.image.startsWith("http") ? item.image : `${API_ROOT}${item.image.startsWith("/") ? "" : "/"}${item.image}`;
    return "https://via.placeholder.com/120";
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">Your Cart</h1>

      {cart.length === 0 ? (
        <div className="text-gray-500 text-center py-20">Your cart is empty</div>
      ) : (
        <>
          <div className="space-y-4">
            {cart.map((item, idx) => (
              <div
                key={idx}
                className="flex flex-col sm:flex-row items-center justify-between p-4 border rounded-lg shadow-sm hover:shadow-md transition"
              >
                {/* Product Image */}
                <img
                  src={imageFor(item)}
                  alt={item.title}
                  className="w-28 h-28 sm:w-32 sm:h-32 object-cover rounded-lg mr-0 sm:mr-4 mb-3 sm:mb-0"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = "https://via.placeholder.com/150";
                  }}
                />

                <div className="flex-1 text-center sm:text-left mt-2 sm:mt-0">
                  <Link
                    to={`/product/${item.product_id}`}
                    className="font-semibold text-lg text-gray-800 hover:text-purple-600 transition"
                  >
                    {item.title}
                  </Link>
                  <div className="text-purple-900 font-bold mt-1">₹{item.price.toFixed(2)}</div>
                </div>

                <div className="flex items-center gap-2 mt-3 sm:mt-0">
                  <button
                    onClick={() => decrement(idx)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    value={item.quantity}
                    min={1}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (val >= 1) updateQty(idx, val);
                    }}
                    className="w-16 border rounded p-1 text-center"
                  />
                  <button
                    onClick={() => increment(idx)}
                    className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
                  >
                    +
                  </button>
                  <button
                    onClick={() => removeItem(idx)}
                    className="ml-2 text-red-600 font-medium hover:text-red-800 transition"
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-6 flex flex-col md:flex-row justify-between items-center gap-4 bg-gray-50 p-4 rounded-lg shadow-inner">
            <div className="text-xl font-semibold text-gray-800">
              Subtotal: <span className="text-purple-900">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={() => navigate("/products")}
                className="px-4 py-2 border rounded hover:bg-gray-100 transition"
              >
                Continue Shopping
              </button>
              <button
                onClick={() => navigate("/checkout")}
                className="bg-green-400 text-white px-4 py-2 rounded hover:bg-green-700 transition transform hover:scale-105"
              >
                Proceed to Checkout
              </button>
            </div>
          </div>
        </>
      )}

      {loadingImages && <div className="mt-4 text-sm text-gray-600">Loading product images…</div>}
    </div>
  );
}

