// src/pages/Register.jsx
import React, { useContext, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Register() {
  const { register } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await register(username.trim(), email.trim(), password);
      alert("Registration successful. Please login.");
      nav("/login");
    } catch (err) {
      setError(err?.message || "Registration failed. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 rounded-lg shadow-md  bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">Register</h1>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded text-sm">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-400 outline-none"
          placeholder="Username"
          required
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-400 outline-none"
          placeholder="Email"
          required
        />

        {/* Password field with toggle */}
        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Password (min 6 chars)"
            minLength={6}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
          >
            {showPassword ? "Hide" : "Show"}
          </button>
        </div>

        {/* Confirm password field with toggle */}
        <div className="relative">
          <input
            type={showConfirmPassword ? "text" : "password"}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Confirm Password"
            minLength={6}
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword((v) => !v)}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 text-sm text-gray-500 hover:text-gray-700"
          >
            {showConfirmPassword ? "Hide" : "Show"}
          </button>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded text-white font-semibold ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 transition"
          }`}
        >
          {loading ? "Registering..." : "Register"}
        </button>
      </form>

      <p className="text-sm text-gray-500 mt-4 text-center">
        Already have an account?{" "}
        <span
          onClick={() => nav("/login")}
          className="text-blue-600 cursor-pointer hover:underline"
        >
          Login
        </span>
      </p>
    </div>
  );
}
