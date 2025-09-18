import React, { useContext, useState } from "react";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const { login } = useContext(AuthContext);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login(username.trim(), password);
      nav("/");
    } catch (err) {
      const msg = err?.message || "Login failed";

      if (msg.toLowerCase().includes("no active account")) {
        // If the user does not exist -> redirect to register page
        setError("User not registered. Redirecting to Register page...");
        nav("/register");
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-12 p-6 rounded-lg shadow-md  bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100">
      <h1 className="text-2xl font-bold mb-6 text-gray-800 text-center">Login</h1>

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

        <div className="relative">
          <input
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border rounded p-2 focus:ring-2 focus:ring-blue-400 outline-none"
            placeholder="Password"
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

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded text-white font-semibold ${
            loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700 transition"
          }`}
        >
          {loading ? "Signing in..." : "Sign In"}
        </button>
      </form>

      <div className="mt-4 text-sm text-gray-500 flex justify-between">
        <span
          className="text-blue-600 cursor-pointer hover:underline"
          onClick={() => nav("/register")}
        >
          Create account
        </span>
      </div>
    </div>
  );
}

