import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axiosClient from "../api/axiosClient";
import BannerImg from "../assets/images/banner.jpg";

export default function Home() {
  const [featured, setFeatured] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    axiosClient
      .get("/products/?page=1&page_size=8")
      .then((res) => {
        if (!mounted) return;
        const data = res.data;
        const items = Array.isArray(data)
          ? data.slice(0, 4)
          : (data.results || []).slice(0, 4);
        setFeatured(items);
      })
      .catch((err) => {
        console.error("Failed to load featured products:", err.response || err);
        setFeatured([]);
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero / Banner */}
      <section className="relative">
        <img
          src={BannerImg}
          alt="Shop Banner"
          className="w-full h-72 md:h-96 object-cover brightness-95"
        />
      </section>

      {/* Hero Content */}
      <section className="bg-white py-12">
        <div className="max-w-4xl mx-auto text-center px-4">
          <h1 className="text-3xl md:text-5xl font-extrabold text-gray-800 leading-tight">
            Discover Quality Products
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-purple-400 via-pink-400 to-pink-600">
               <br />Delivered to Your Door
            </span>
          </h1>
          <p className="mt-4 text-gray-600 text-base md:text-lg max-w-2xl mx-auto">
            Curated collections, fair prices, and fast checkout. Explore trending gadgets,
            fashion, and home essentials with a seamless shopping experience.
          </p>
          <div className="mt-8 flex justify-center gap-4 flex-wrap">
            <Link
              to="/products"
              className="bg-gradient-to-r from-purple-400 via-pink-400 to-pink-600 text-white px-6 py-3 rounded-lg font-semibold shadow hover:scale-105 transform transition"
            >
              Shop All Products
            </Link>
            <Link
              to="/products"
              className="border-2 border-gradient-to-r from-purple-400 via-pink-400 to-pink-600 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gradient-to-r hover:from-purple-100 hover:via-pink-100 hover:to-pink-200 transition"
            >
              Browse Collections
            </Link>
          </div>
        </div>
      </section>

      {/* Value Propositions */}
      <section className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { emoji: "🚚", title: "Fast Delivery", text: "Reliable shipping to your doorstep with real-time tracking." },
          { emoji: "💳", title: "Secure Payments", text: "Safe and demo-friendly checkout with multiple options." },
          { emoji: "⭐", title: "Top Quality", text: "Products from trusted sellers with admin-curated collections." },
        ].map((item, i) => (
          <div
            key={i}
            className="p-6 rounded-xl shadow-lg hover:shadow-2xl transform hover:-translate-y-1 transition-all duration-300 bg-white"
          >
            <div className="text-4xl">{item.emoji}</div>
            <h3 className="mt-4 font-semibold text-lg">{item.title}</h3>
            <p className="mt-2 text-gray-600 text-sm">{item.text}</p>
          </div>
        ))}
      </section>

      {/* Featured Products */}
      <section className="max-w-6xl mx-auto px-4 pb-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-semibold text-gray-800">Featured Products</h2>
          <Link
            to="/products"
            className="text-purple-500 hover:underline"
          >
            See all
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-56 bg-white rounded-lg shadow animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {featured.length === 0 ? (
              <div className="col-span-2 text-gray-500">No featured products available.</div>
            ) : (
              featured.map((p) => {
                const imageSrc = p.image_url || p.image || "https://via.placeholder.com/300";
                return (
                  <Link
                    to={`/product/${p.id}`}
                    key={p.id}
                    className="border rounded-lg overflow-hidden bg-white hover:shadow-lg transition"
                  >
                    <img
                      src={imageSrc}
                      alt={p.title}
                      className="w-full h-40 object-cover"
                      onError={(e) => (e.currentTarget.src = "https://via.placeholder.com/300")}
                    />
                    <div className="p-3">
                      <div className="font-medium text-sm line-clamp-2">{p.title}</div>
                      <div className="mt-2 font-semibold text-purple-900">
                        ${Number(p.price).toFixed(2)}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        )}
      </section>
    </div>
  );
}
