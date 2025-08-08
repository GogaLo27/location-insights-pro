import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { reviewText, action = 'analyze' } = await req.json();

    if (action === 'analyze') {
      return await analyzeReview(reviewText);
    } else if (action === 'generate_reply') {
      return await generateReply(reviewText);
    }

    throw new Error('Invalid action');

  } catch (error) {
    console.error('Error in ai-review-analysis function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});

async function analyzeReview(reviewText: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: `You are an AI that analyzes customer reviews for businesses. For each review, you must:

1. Determine sentiment: positive, negative, or neutral
2. Extract 3-5 relevant tags that describe the main topics (e.g., "food", "service", "ambiance", "price", "cleanliness")
3. Provide a brief analysis explaining the sentiment and key points

Respond in JSON format with this structure:
{
  "sentiment": "positive|negative|neutral",
  "tags": ["tag1", "tag2", "tag3"],
  "analysis": "Brief explanation of the sentiment and key points",
  "sentiment_score": 0.85 // number between -1 (very negative) and 1 (very positive)
}`
        },
        {
          role: 'user',
          content: `Analyze this review: "${reviewText}"`
        }
      ],
      temperature: 0.3,
    }),
  });

  const data = await response.json();
  const analysisText = data.choices[0].message.content;
  
  try {
    const analysis = JSON.parse(analysisText);
    return new Response(
      JSON.stringify(analysis),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (parseError) {
    throw new Error('Failed to parse AI analysis response');
  }
}

async function generateReply(reviewText: string) {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAIApiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4.1-2025-04-14',
      messages: [
        {
          role: 'system',
          content: `You are a professional customer service representative writing replies to Google Business reviews. Your replies should be:

1. Professional and courteous
2. Acknowledge the customer's feedback (positive or negative)
3. Thank them for their review
4. For negative reviews, show empathy and offer to resolve issues
5. For positive reviews, express gratitude and encourage return visits
6. Keep replies concise (2-3 sentences max)
7. Always maintain a professional tone

Generate a appropriate reply for the given review.`
        },
        {
          role: 'user',
          content: `Generate a professional reply for this review: "${reviewText}"`
        }
      ],
      temperature: 0.7,
    }),
  });

  const data = await response.json();
  const reply = data.choices[0].message.content;

  return new Response(
    JSON.stringify({ reply }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
}