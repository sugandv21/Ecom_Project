import React from "react";

export default function Footer() {
  return (
    <footer className="bg-gradient-to-r from-purple-500 via-pink-500 to-pink-600 py-6 mt-12 shadow-inner">
      <div className="container mx-auto text-center text-white text-lg md:text-base">
        <p>
          © {new Date().getFullYear()} MyShop. All rights reserved.
        </p>
        <p className="mt-1 text-white/80 text-md">
          Designed with ❤️ for a seamless shopping experience
        </p>
      </div>
    </footer>
  );
}
