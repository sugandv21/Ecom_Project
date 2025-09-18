// src/pages/Checkout.jsx
import React, { useState, useContext } from "react";
import axiosClient from "../api/axiosClient";
import { AuthContext } from "../contexts/AuthContext";
import ModalSuccess from "../components/ModalSuccess";
import { useNavigate } from "react-router-dom";

export default function Checkout() {
  const cart = JSON.parse(localStorage.getItem("cart") || "[]");
  const [address, setAddress] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardExpiry, setCardExpiry] = useState("");
  const [cardCvc, setCardCvc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState(null);
  const [serverError, setServerError] = useState(null);
  const { authHeader, authTokens } = useContext(AuthContext);
  const navigate = useNavigate();

  const buildItems = () =>
    cart.map((i) => ({
      product: Number(i.product_id ?? i.productId ?? i.id),
      quantity: Number(i.quantity ?? 1),
    }));

  const validatePaymentFields = () => {
    if (paymentMethod === "card") {
      if (!cardNumber.trim()) return "Card number is required.";
      if (!cardExpiry.trim()) return "Card expiry is required.";
      if (!cardCvc.trim()) return "CVC is required.";
      const ccDigits = cardNumber.replace(/\s+/g, "");
      if (!/^\d{12,19}$/.test(ccDigits)) return "Enter valid card number.";
      if (!/^\d{3,4}$/.test(cardCvc)) return "Enter valid CVC (3-4 digits).";
      if (!/^\d{2}\/\d{2}$/.test(cardExpiry)) return "Expiry must be MM/YY.";
    } else if (paymentMethod === "gpay") {
      if (!upiId.trim()) return "UPI ID is required.";
      if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId))
        return "Enter a valid UPI ID (e.g., alice@okaxis).";
    }
    return null;
  };

  const submitOrder = async (e) => {
    e.preventDefault();
    setServerError(null);

    if (!authTokens) return setServerError("You must be logged in.");
    if (!cart.length) return setServerError("Cart is empty.");
    if (!address.trim()) return setServerError("Provide a shipping address.");

    const payErr = validatePaymentFields();
    if (payErr) return setServerError(payErr);

    setLoading(true);
    const items = buildItems();

    const payment_details =
      paymentMethod === "card"
        ? { card_number: cardNumber.replace(/\s+/g, ""), expiry: cardExpiry, cvc: cardCvc }
        : paymentMethod === "gpay"
        ? { upi_id: upiId }
        : {};

    try {
      const res = await axiosClient.post(
        "/orders/",
        { items, shipping_address: address, payment_method: paymentMethod, payment_details },
        { headers: authHeader() }
      );
      localStorage.removeItem("cart");
      setSuccessData(res.data);
    } catch (err) {
      console.error(err);
      if (!err.response) setServerError("Network error. Check console.");
      else if ([401, 403].includes(err.response.status)) setServerError("Authentication error.");
      else {
        const d = err.response.data;
        if (typeof d === "string") setServerError(d);
        else if (Array.isArray(d)) setServerError(d.join(" "));
        else {
          const parts = [];
          Object.keys(d).forEach((k) => {
            const v = d[k];
            parts.push(`${k}: ${Array.isArray(v) ? v.join(" ") : v}`);
          });
          setServerError(parts.join(" | "));
        }
      }
    } finally {
      setLoading(false);
    }
  };

  if (successData) return <ModalSuccess order={successData} onClose={() => navigate("/tracking")} />;

  return (
    <div className="max-w-md mx-auto my-8 p-6 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold mb-6 text-gray-800">Checkout</h1>

      {serverError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded">
          {serverError}
        </div>
      )}

      <form onSubmit={submitOrder} className="space-y-5">
        <div>
          <label className="block font-medium mb-1">Shipping Address</label>
          <textarea
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-300"
            placeholder="Enter your shipping address"
          />
        </div>

        <div>
          <h3 className="font-medium mb-2">Payment Method</h3>
          <div className="space-y-2">
            {["card", "gpay", "cod"].map((method) => (
              <label key={method} className="flex items-center gap-3">
                <input
                  type="radio"
                  name="payment"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                  className="form-radio"
                />
                <span className="ml-1 capitalize">{method === "gpay" ? "GPay / UPI" : method === "cod" ? "Cash on Delivery" : "Card"}</span>
              </label>
            ))}
          </div>
        </div>

        {paymentMethod === "card" && (
          <div className="space-y-2">
            <label className="block font-medium">Card Details</label>
            <input
              placeholder="Card number"
              value={cardNumber}
              onChange={(e) => setCardNumber(e.target.value)}
              className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-300"
            />
            <div className="flex gap-2">
              <input
                placeholder="MM/YY"
                value={cardExpiry}
                onChange={(e) => setCardExpiry(e.target.value)}
                className="flex-1 border rounded p-2 focus:ring-2 focus:ring-blue-300"
              />
              <input
                placeholder="CVC"
                value={cardCvc}
                onChange={(e) => setCardCvc(e.target.value)}
                className="w-24 border rounded p-2 focus:ring-2 focus:ring-blue-300"
              />
            </div>
            <p className="text-xs text-gray-500">Demo mode only. Do not use real card info.</p>
          </div>
        )}

        {paymentMethod === "gpay" && (
          <div>
            <label className="block font-medium mb-1">GPay / UPI ID</label>
            <input
              placeholder="yourupi@bank"
              value={upiId}
              onChange={(e) => setUpiId(e.target.value)}
              className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-300"
            />
            <p className="text-xs text-gray-500 mt-1">Demo mode: order marked as paid automatically.</p>
          </div>
        )}

        {paymentMethod === "cod" && (
          <div className="p-3 bg-yellow-50 border border-yellow-100 rounded text-sm">
            Pay the courier when your order arrives.
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4">
          <button
            type="button"
            onClick={() => navigate("/cart")}
            className="px-4 py-2 border rounded hover:bg-gray-100 transition"
          >
            Back to Cart
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            {loading ? "Placing order..." : "Place Order"}
          </button>
        </div>
      </form>
    </div>
  );
}
