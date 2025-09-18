import React, { useEffect, useState, useRef } from "react";
import axiosClient from "../api/axiosClient";
import { Link } from "react-router-dom";

export default function Products() {
  const [products, setProducts] = useState([]);
  const [next, setNext] = useState(null);
  const [previous, setPrevious] = useState(null);
  const [page, setPage] = useState(1);
  const [count, setCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [notice, setNotice] = useState(null);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [ordering, setOrdering] = useState("");

  const searchTimeout = useRef(null);
  const PAGE_SIZE = 12;
  const API_ROOT = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/api\/v1\/?$/, "");

  useEffect(() => {
    let mounted = true;
    axiosClient.get("/categories/").then((res) => {
      if (!mounted) return;
      const data = res.data;
      setCategories(Array.isArray(data) ? data : data.results || []);
    }).catch(console.error);
    return () => { mounted = false; };
  }, []);

  const buildQuery = (pg = 1) => {
    const params = new URLSearchParams();
    params.set("page", pg);
    if (searchTerm) params.set("search", searchTerm);
    if (ordering) params.set("ordering", ordering);
    if (selectedCategory) params.set("category__id", selectedCategory);
    if (minPrice !== "") params.set("price__gte", minPrice);
    if (maxPrice !== "") params.set("price__lte", maxPrice);
    return params.toString();
  };

  const fetchProducts = async (pg = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await axiosClient.get(`/products/?${buildQuery(pg)}`);
      const data = res.data;
      if (Array.isArray(data)) {
        setProducts(data);
        setNext(null);
        setPrevious(null);
        setCount(data.length);
        setTotalPages(1);
      } else {
        setProducts(data.results || []);
        setNext(data.next);
        setPrevious(data.previous);
        setCount(data.count || data.results.length);
        setTotalPages(Math.max(1, Math.ceil((data.count || data.results.length) / PAGE_SIZE)));
      }
    } catch (err) {
      setError("Failed to load products. See console for details.");
      console.error(err.response || err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(page); }, [page]);
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => { setPage(1); fetchProducts(1); }, 350);
    return () => clearTimeout(searchTimeout.current);
  }, [selectedCategory, minPrice, maxPrice, ordering, searchTerm]);

  const addToCartLocal = (product) => {
    try {
      const existing = JSON.parse(localStorage.getItem("cart") || "[]");
      const idx = existing.findIndex((i) => Number(i.product_id) === Number(product.id));
      if (idx >= 0) existing[idx].quantity += 1;
      else existing.push({ product_id: product.id, title: product.title, price: Number(product.price), quantity: 1 });
      localStorage.setItem("cart", JSON.stringify(existing));
      setNotice("Added to cart");
      setTimeout(() => setNotice(null), 1500);
    } catch {
      setNotice("Could not add to cart");
      setTimeout(() => setNotice(null), 1500);
    }
  };

  const handlePrev = () => setPage(p => Math.max(1, p - 1));
  const handleNext = () => setPage(p => Math.min(totalPages, p + 1));

  const buildPageList = (current, last) => {
    const pages = [];
    if (last <= 7) return Array.from({ length: last }, (_, i) => i + 1);
    pages.push(1);
    const left = Math.max(2, current - 1);
    const right = Math.min(last - 1, current + 1);
    if (left > 2) pages.push("...");
    for (let i = left; i <= right; i++) pages.push(i);
    if (right < last - 1) pages.push("...");
    pages.push(last);
    return pages;
  };
  const pageList = buildPageList(page, totalPages);

  return (
    <div className="max-w-7xl mx-auto px-4 py-6">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Products</h1>

      {/* Filters */}
      <div className="mb-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <input
          type="search"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search products..."
          className="border rounded p-2 w-full focus:ring-2 focus:ring-purple-400 focus:outline-none"
        />
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="border rounded p-2 w-full focus:ring-2 focus:ring-purple-400 focus:outline-none"
        >
          <option value="">All categories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <div className="flex gap-2">
          <input type="number" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Min price" className="border rounded p-2 w-full focus:ring-2 focus:ring-purple-400 focus:outline-none" min="0" />
          <input type="number" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Max price" className="border rounded p-2 w-full focus:ring-2 focus:ring-purple-400 focus:outline-none" min="0" />
        </div>
        <select value={ordering} onChange={(e) => setOrdering(e.target.value)} className="border rounded p-2 w-full focus:ring-2 focus:ring-purple-400 focus:outline-none">
          <option value="">Sort:</option>
          <option value="price">Price: Low → High</option>
          <option value="-price">Price: High → Low</option>
          <option value="title">Name: A → Z</option>
          <option value="-title">Name: Z → A</option>
          <option value="-created">Newest</option>
        </select>
      </div>

      {notice && <div className="mb-4 text-green-700 bg-green-50 p-2 rounded">{notice}</div>}
      {loading && <div className="mb-4 text-center text-gray-500">Loading products…</div>}
      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">{error}</div>}

      {/* Products Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {products.map(p => {
          const imageSrc = p.image_url || (p.image ? `${API_ROOT}${p.image.startsWith("/") ? "" : "/"}${p.image}` : "https://via.placeholder.com/300");
          return (
            <div key={p.id} className="bg-white border rounded-lg overflow-hidden shadow hover:shadow-lg transition transform hover:-translate-y-1">
              <Link to={`/product/${p.id}`}>
                <img src={imageSrc} alt={p.title} className="w-full h-48 object-cover" onError={(e) => { e.currentTarget.src = "https://via.placeholder.com/300"; }} />
                <h3 className="mt-2 px-3 py-1 font-medium text-gray-800 line-clamp-2">{p.title}</h3>
              </Link>
              <div className="mt-2 px-3 pb-3 flex justify-between items-center">
                <div className="text-lg font-bold text-purple-900">₹{Number(p.price).toFixed(2)}</div>
                <button onClick={() => addToCartLocal(p)} className="bg-purple-900 text-white px-3 py-1 rounded hover:bg-purple-400 transition">Add</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        <button onClick={handlePrev} disabled={page === 1 || loading} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition">Prev</button>
        {pageList.map((pItem, idx) =>
          pItem === "..." ? <span key={idx} className="px-2 text-gray-500">…</span> :
            <button key={pItem} onClick={() => setPage(Number(pItem))} className={`px-3 py-1 rounded ${pItem === page ? "bg-purple-900 text-white" : "bg-gray-100 hover:bg-gray-200"}`}>{pItem}</button>
        )}
        <button onClick={handleNext} disabled={page === totalPages || loading} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 hover:bg-gray-300 transition">Next</button>
      </div>
    </div>
  );
}
