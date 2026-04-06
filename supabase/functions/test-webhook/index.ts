import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const allowedOrigins = ["https://dibiex.com", "https://admin.dibiex.com", "http://localhost:8080", "http://localhost:5173"];


serve(async (req) => {
  const origin = req.headers.get('Origin') ?? ''
  const cors = {
    'Access-Control-Allow-Origin': allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  }
  if (req.method === "OPTIONS") return new Response(null, { headers: cors })

  try {
    const body = await req.text()
    console.log("Webhook test received:", body)
    
    return new Response(JSON.stringify({ 
      success: true, 
      message: "Webhook test successful",
      received: body 
    }), {
      status: 200,
      headers: { ...cors, "Content-Type": "application/json" }
    })

  } catch (error) {
    console.error("Error in webhook test:", error)
    return new Response(JSON.stringify({ 
      error: error.message || "Failed to process webhook test" 
    }), { 
      status: 400, 
      headers: { ...cors, "Content-Type": "application/json" 
    }})
  }
})
