// import axios from "axios";

// const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

// const axiosClient = axios.create({
//   baseURL: API_URL,
//   headers: {
//     "Content-Type": "application/json",
//   },
// });

// export default axiosClient;


import axios from "axios";

const BASE = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api/v1";

const axiosClient = axios.create({
  baseURL: BASE,
  headers: { "Content-Type": "application/json" },
  withCredentials: false, // set true if using cookie-based auth
});

// attach access token automatically
axiosClient.interceptors.request.use((config) => {
  try {
    const tokens = JSON.parse(localStorage.getItem("tokens") || "null");
    if (tokens && tokens.access) {
      config.headers = config.headers || {};
      config.headers.Authorization = `Bearer ${tokens.access}`;
    }
  } catch (e) {}
  return config;
});

// optional: response interceptor to handle 401 -> attempt refresh
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach((prom) => {
    if (error) prom.reject(error);
    else prom.resolve(token);
  });
  failedQueue = [];
};

axiosClient.interceptors.response.use(
  (res) => res,
  async (err) => {
    const originalReq = err.config;
    if (err.response && err.response.status === 401 && !originalReq._retry) {
      originalReq._retry = true;
      const tokens = JSON.parse(localStorage.getItem("tokens") || "null");
      if (!tokens?.refresh) {
        // no refresh token -> reject
        return Promise.reject(err);
      }

      if (isRefreshing) {
        // queue the request until the refresh finishes
        return new Promise(function (resolve, reject) {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            originalReq.headers.Authorization = "Bearer " + token;
            return axiosClient(originalReq);
          })
          .catch((e) => Promise.reject(e));
      }

      isRefreshing = true;
      try {
        const resp = await axiosClient.post("/auth/token/refresh/", { refresh: tokens.refresh });
        const newTokens = resp.data;
        // store new tokens
        const merged = { ...tokens, ...newTokens };
        localStorage.setItem("tokens", JSON.stringify(merged));
        // notify queued requests
        processQueue(null, newTokens.access);
        originalReq.headers.Authorization = "Bearer " + newTokens.access;
        return axiosClient(originalReq);
      } catch (refreshErr) {
        processQueue(refreshErr, null);
        // refresh failed -> remove tokens
        localStorage.removeItem("tokens");
        return Promise.reject(refreshErr);
      } finally {
        isRefreshing = false;
      }
    }
    return Promise.reject(err);
  }
);

export default axiosClient;
