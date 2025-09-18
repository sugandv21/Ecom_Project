import React from "react";

export default function ModalSuccess({ order, onClose }) {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
      <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-sm p-6 text-center animate-fadeIn">
        <h2 className="text-2xl font-bold text-green-600">🎉 Order Placed!</h2>
        <p className="mt-3 text-gray-700">Your order <span className="font-medium">#{order.id}</span> was placed successfully.</p>
        <div className="mt-6 flex flex-col sm:flex-row justify-center gap-3">
          <button
            onClick={onClose}
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded transition transform hover:scale-105"
          >
            Track Order
          </button>
          <button
            onClick={() => window.location.reload()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold px-4 py-2 rounded transition transform hover:scale-105"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
