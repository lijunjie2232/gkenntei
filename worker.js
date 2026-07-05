// Import the static QA data (Assuming a bundler like Wrangler handles this path)
import qaData from 'frontend/dist/q_a_clean_qw.json';

const VERSION = "1.0.0"; // Replace with your versioning mechanism

// Helper to create CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Max-Age": "86400",
};

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const pathname = url.pathname;

    // 1. Handle CORS Preflight (OPTIONS)
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // 2. Route: GET /q
      if (pathname === "/q" && request.method === "GET") {
        if (!qaData || qaData.length === 0) {
          return JSONResponse({ error: "No data available" });
        }

        let id = parseInt(url.searchParams.get("id") || "1", 10);
        if (isNaN(id) || id < 1 || id > qaData.length) {
          id = 1;
        }

        const item = qaData[id - 1] || {};
        return JSONResponse({
          question: item.question || "",
          options: item.options || [],
          total: qaData.length,
        });
      }

      // 3. Route: POST /a
      if (pathname === "/a" && request.method === "POST") {
        if (!qaData || qaData.length === 0) {
          return JSONResponse({ error: "No data available" });
        }

        let body;
        try {
          body = await request.json();
        } catch (e) {
          return JSONResponse({ error: "Invalid JSON body" }, 400);
        }

        let id = body.id;
        if (typeof id !== "number" || id < 1 || id > qaData.length) {
          id = 1;
        }

        const item = qaData[id - 1] || {};
        const answer = item.answer || {};
        return JSONResponse({
          answer: answer.explain || "",
          correct_id: answer.id !== undefined ? answer.id : -1,
        });
      }

      // 4. Route: GET /v
      if (pathname === "/v" && request.method === "GET") {
        return JSONResponse({ version: VERSION });
      }

      // 5. Frontend & Fallback Static Assets (SPA routing)
      // If you are using Cloudflare Workers Assets/KV for frontend:
      if (env.ASSETS) {
        let response = await env.ASSETS.fetch(request);
        
        // If file not found (404), serve index.html for SPA client-side routing
        if (response.status === 404) {
          const indexUrl = new URL("/", request.url);
          return await env.ASSETS.fetch(new Request(indexUrl, request));
        }
        return response;
      }

      // Default 404 response if asset binding isn't used
      return JSONResponse({ detail: "Not Found" }, 404);

    } catch (error) {
      return JSONResponse({ error: error.message }, 500);
    }
  },
};

// Helper function to return JSON responses with CORS
function JSONResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status: status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
}