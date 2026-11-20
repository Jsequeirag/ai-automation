import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  experimental: {
    agentFeedback: true,
  },
  cacheComponents: true,
  // El lector de PDF carga pdf.js con un import dinámico: mejor sin empaquetar.
  // (@huggingface/transformers y onnxruntime-node ya vienen excluidos por Next.)
  serverExternalPackages: ["pdf-parse", "@langchain/community"],
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
