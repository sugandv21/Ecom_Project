import React, { useContext, useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { AuthContext } from "../contexts/AuthContext";

export default function Navbar() {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/");
    setOpen(false);
  };

  const linkBase = "relative text-lg md:text-xl font-medium px-3 py-1 transition-all duration-300";
  const linkActive =
    "text-black font-semibold after:content-[''] after:absolute after:left-0 after:-bottom-1 after:w-full after:h-[6px] after:bg-gradient-to-r from-purple-400 via-pink-400 to-pink-100 after:rounded-full";
  const linkInactive = "text-white hover:text-yellow-200";

  // Robust display name resolution from various token/profile shapes
  const getDisplayName = (u) => {
    if (!u) return null;
    if (typeof u === "string" && u.trim()) return u;
    const candidates = [
      u.username,
      u.name,
      u.full_name,
      u.first_name && u.last_name && `${u.first_name} ${u.last_name}`,
      u.first_name,
      u.preferred_username,
      typeof u.email === "string" ? u.email.split("@")[0] : null,
      u.user && u.user.username,
      u.user && u.user.email && u.user.email.split("@")[0],
    ];
    for (const c of candidates) {
      if (typeof c === "string" && c.trim()) return c;
    }
    if (u.user_id) return String(u.user_id);
    if (u.id) return String(u.id);
    return null;
  };

  const displayName = getDisplayName(user) || "User";

  // initials for avatar (max 2 chars)
  const initials = (displayName || "U")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  return (
    <nav className="bg-gradient-to-r from-purple-600 via-pink-500 to-pink-600 shadow-lg">
      <div className="container mx-auto px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-3">
          <span className="text-2xl md:text-3xl font-extrabold text-white hover:text-yellow-200 transition-colors">
            DVShop
          </span>
        </Link>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <NavLink to="/" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Home</NavLink>
          <NavLink to="/products" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Shop</NavLink>
          <NavLink to="/cart" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Cart</NavLink>
          {user && <NavLink to="/tracking" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Track Order</NavLink>}

          {user ? (
            <>
              <div className="flex items-center gap-3 px-2">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold">
                  {initials}
                </div>
                <div className="text-white">
                  <span>Hi, {displayName}</span>
                </div>
              </div>

              <button
                onClick={handleLogout}
                className="bg-red-500 text-white px-4 py-2 rounded-lg text-lg hover:bg-red-600 active:bg-red-700 transition-all duration-300"
              >
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Login</NavLink>
              <NavLink to="/register" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkInactive}`}>Register</NavLink>
            </>
          )}
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <button
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="p-2 rounded-md text-white hover:bg-white/10 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {open ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 8h16M4 16h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div className={`md:hidden bg-gradient-to-r from-purple-600 via-pink-500 to-pink-600 transition-max-height duration-300 overflow-hidden ${open ? "max-h-screen" : "max-h-0"}`}>
        <div className="px-4 pb-4 pt-2 space-y-2">
          <NavLink to="/" onClick={() => setOpen(false)} className="block text-white py-2 rounded">Home</NavLink>
          <NavLink to="/products" onClick={() => setOpen(false)} className="block text-white py-2 rounded">Shop</NavLink>
          <NavLink to="/cart" onClick={() => setOpen(false)} className="block text-white py-2 rounded">Cart</NavLink>
          {user && <NavLink to="/tracking" onClick={() => setOpen(false)} className="block text-white py-2 rounded">Track Order</NavLink>}

          <div className="border-t border-white/10 my-2" />

          {user ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white font-semibold">{initials}</div>
                <div className="text-white">
                  <div className="text-sm">Hi,</div>
                  <div className="font-medium">{displayName}</div>
                </div>
              </div>
              <button onClick={() => { handleLogout(); }} className="bg-red-500 text-white px-3 py-1 rounded">Logout</button>
            </div>
          ) : (
            <div className="flex gap-2">
              <NavLink to="/login" onClick={() => setOpen(false)} className="block text-white py-2 rounded">Login</NavLink>
              <NavLink to="/register" onClick={() => setOpen(false)} className="block text-white py-2 rounded">Register</NavLink>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}


