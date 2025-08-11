// /supabase/functions/generate-ai-reply/index.ts
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};

function pickPrompt(obj: any): string | null {
  if (!obj || typeof obj !== "object") return null;
  if (typeof obj.prompt === "string") return obj.prompt;
  if (obj.body && typeof obj.body.prompt === "string") return obj.body.prompt;
  if (obj.data && typeof obj.data.prompt === "string") return obj.data.prompt;
  return null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const rawKey = Deno.env.get("OPENAI_API_KEY") ?? "";
    const openAIApiKey = rawKey.trim();
    if (!openAIApiKey) {
      return new Response(JSON.stringify({ error: "OpenAI API key not configured" }), {
        status: 500,
        headers: corsHeaders,
      });
    }

    const url = new URL(req.url);
    const ct = req.headers.get("content-type") || "";
    let prompt: string | null = url.searchParams.get("prompt");
    let raw = "";
    try { raw = await req.text(); } catch {}

    if (!prompt && raw) {
      let parsed: any = null;
      try { parsed = JSON.parse(raw); } catch { /* raw might be plain text */ }

      if (typeof parsed === "string") {
        prompt = parsed;                 // JSON string body
      } else if (parsed && typeof parsed === "object") {
        prompt = pickPrompt(parsed);     // JSON object body
      } else {
        prompt = raw;                    // plain text body
      }
    }

    prompt = (prompt || "").trim();
    console.log("generate-ai-reply", { ct, rawLen: raw.length, promptLen: prompt.length });

    if (!prompt) {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini", // also OK: 'gpt-4.1-2025-04-14' if enabled on your account
        messages: [
          { role: "system", content: "You are a professional business reply generator. Generate helpful, empathetic, and professional responses to customer reviews." },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    });

    if (!response.ok) {
      const t = await response.text().catch(() => "");
      console.error("OpenAI API error:", response.status, t);
      return new Response(JSON.stringify({ error: `OpenAI API error: ${response.status}` }), {
        status: response.status,
        headers: corsHeaders,
      });
    }

    const data = await response.json().catch(() => null as any);
    const reply =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ?? null;

    if (!reply) {
      return new Response(JSON.stringify({ error: "AI reply not available. Please try again later." }), {
        status: 200,
        headers: corsHeaders,
      });
    }

    return new Response(JSON.stringify({ reply }), { headers: corsHeaders });
  } catch (error: any) {
    console.error("Error in generate-ai-reply function:", error);
    return new Response(JSON.stringify({ error: String(error?.message ?? error) }), {
      status: 500,
      headers: corsHeaders,
    });
  }
});
