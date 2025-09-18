import React, { useEffect, useState, useContext } from "react";
import axiosClient from "../api/axiosClient";
import { useParams, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const API_ROOT = import.meta.env.VITE_API_URL?.replace(/\/api\/v1\/?$/, "") || "";


  useEffect(() => {
    let mounted = true;
    axiosClient
      .get(`/products/${id}/`)
      .then((res) => mounted && setProduct(res.data))
      .catch((err) => console.error("Failed to load product:", err.response || err));
    return () => { mounted = false; };
  }, [id]);

  if (!product) return <div className="text-center py-20 text-gray-500">Loading product...</div>;

  const imageSrc =
    product.image_url ||
    (product.image ? `${API_ROOT}${product.image.startsWith("/") ? "" : "/"}${product.image}` : "https://via.placeholder.com/600x400?text=No+Image");

  const addToCart = () => {
    const existing = JSON.parse(localStorage.getItem("cart") || "[]");
    const idx = existing.findIndex((i) => Number(i.product_id) === Number(product.id));
    if (idx >= 0) existing[idx].quantity += 1;
    else existing.push({ product_id: Number(product.id), title: product.title, price: Number(product.price), quantity: 1 });
    localStorage.setItem("cart", JSON.stringify(existing));
    alert("Added to cart");
  };

  const buyNow = () => {
    localStorage.setItem("cart", JSON.stringify([{ product_id: Number(product.id), title: product.title, price: Number(product.price), quantity: 1 }]));
    if (!user) navigate("/login");
    else navigate("/checkout");
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="bg-white rounded-xl shadow-lg overflow-hidden md:flex md:gap-6">
        {/* Image Section */}
        <div className="md:w-1/2">
          <img
            src={imageSrc}
            alt={product.title}
            className="w-full h-80 md:h-full object-cover transition-transform duration-300 hover:scale-105"
            onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/600x400?text=Image+Unavailable"; }}
          />
        </div>

        {/* Details Section */}
        <div className="p-6 flex-1 flex flex-col justify-between">
          <div>
            <h2 className="text-3xl font-bold text-gray-800">{product.title}</h2>
            {product.subtitle && <p className="text-gray-500 mt-1 text-sm">{product.subtitle}</p>}
            <div className="mt-4 text-2xl font-semibold text-purple-600">₹{Number(product.price).toFixed(2)}</div>
            {product.description && (
              <p className="mt-4 text-gray-700 whitespace-pre-wrap leading-relaxed">{product.description}</p>
            )}
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex flex-col sm:flex-row gap-4">
            <button
              onClick={buyNow}
              className="flex-1 bg-green-400 hover:bg-green-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition transform hover:scale-105"
            >
              Buy Now
            </button>
            <button
              onClick={addToCart}
              className="flex-1 bg-purple-600 hover:bg-purple-700 text-white font-semibold px-6 py-3 rounded-lg shadow-md transition transform hover:scale-105"
            >
              Add to Cart
            </button>
          </div>
        </div>
      </div>

      {/* Optional Additional Info */}
      <div className="mt-8 text-gray-600 text-sm">
        <p>Category: {product.category?.name || "Uncategorized"}</p>
      </div>
    </div>
  );
}
