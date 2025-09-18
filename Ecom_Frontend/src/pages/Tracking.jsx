import React, { useEffect, useState, useContext } from "react";
import axiosClient from "../api/axiosClient";
import { AuthContext } from "../contexts/AuthContext";

export default function Tracking() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [serverError, setServerError] = useState(null);
  const { authHeader, authTokens } = useContext(AuthContext);

  const API_ROOT = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/api\/v1\/?$/, "");

  useEffect(() => {
    let mounted = true;

    const fetchOrders = async () => {
      setLoading(true);
      setServerError(null);

      if (!authTokens) {
        setServerError("You must be logged in to view your orders.");
        setOrders([]);
        setLoading(false);
        return;
      }

      try {
        const res = await axiosClient.get("/orders/", { headers: authHeader() });
        const data = res.data;

        if (!mounted) return;

        if (Array.isArray(data)) setOrders(data);
        else if (data?.results) setOrders(data.results);
        else if (data?.items) setOrders(data.items);
        else {
          setOrders([]);
          setServerError("Unexpected response from server.");
        }
      } catch (err) {
        console.error("Orders fetch error:", err.response || err);
        if (!err.response) setServerError("Network error. Check your connection.");
        else if ([401, 403].includes(err.response.status)) setServerError("Authentication error. Please login again.");
        else setServerError("Failed to fetch orders. See console for details.");
        setOrders([]);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    fetchOrders();
    return () => {
      mounted = false;
    };
  }, [authHeader, authTokens]);

  const imageForItem = (it) => {
    const prod = it.product || it.product_id || it.productId || null;
    if (prod && typeof prod === "object") {
      if (prod.image_url) return prod.image_url;
      if (prod.image) return prod.image.startsWith("http") ? prod.image : `${API_ROOT}${prod.image.startsWith("/") ? "" : "/"}${prod.image}`;
      if (prod.thumbnail) return prod.thumbnail;
    }
    if (it.image_url) return it.image_url;
    if (it.image) return it.image.startsWith("http") ? it.image : `${API_ROOT}${it.image.startsWith("/") ? "" : "/"}${it.image}`;
    return "https://via.placeholder.com/80";
  };

  if (loading) return <div className="text-center py-10 text-gray-500">Loading your orders...</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-800 text-center">Your Orders</h1>

      {serverError && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded text-center">
          {serverError}
        </div>
      )}

      {!serverError && orders.length === 0 && (
        <div className="text-center text-gray-500 py-20">No orders found.</div>
      )}

      <div className="space-y-6">
        {orders.map((o) => (
          <div key={o.id} className="border rounded-lg bg-white shadow hover:shadow-lg transition p-4">
            {/* Order Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
              <div>
                <div className="text-sm text-gray-600">Order #{o.id}</div>
                <div className="text-xs text-gray-500">{o.created_at ? new Date(o.created_at).toLocaleString() : ""}</div>
              </div>
              <div className={`mt-2 sm:mt-0 px-3 py-1 rounded-full text-sm font-medium ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                {o.status || "pending"}
              </div>
            </div>

            {/* Order Items */}
            <div className="mt-4 grid grid-cols-1 gap-3">
              {(o.items || []).map((it) => {
                const img = imageForItem(it);
                const title = it.product?.title || it.product?.name || it.product || it.title || "Product";

                return (
                  <div key={it.id || `${o.id}-${it.product?.id || Math.random()}`} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                    <img
                      src={img}
                      alt={title}
                      className="w-20 h-20 object-cover rounded"
                      onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = "https://via.placeholder.com/80"; }}
                    />
                    <div className="flex-1">
                      <div className="font-medium text-gray-800">{title}</div>
                      <div className="text-sm text-gray-600 mt-1">Qty: {it.quantity}</div>
                      <div className="text-sm text-gray-600">Price: ₹{Number(it.price_snapshot ?? it.price ?? 0).toFixed(2)}</div>
                    </div>
                    <div className="text-right font-semibold text-gray-700">
                      ₹{Number((it.quantity || 1) * (it.price_snapshot ?? it.price ?? 0)).toFixed(2)}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Footer */}
            <div className="mt-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div className="text-sm text-gray-600">
                Shipping: <span className="font-medium">{o.shipping_address || "—"}</span>
              </div>
              <div className="text-lg font-bold text-gray-800">
                Total: ₹{Number(o.total_price || 0).toFixed(2)}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

