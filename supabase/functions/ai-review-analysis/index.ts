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
    const body = await req.json();
    console.log('Request body:', body);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { reviews } = body;
    if (!reviews || !Array.isArray(reviews)) {
      throw new Error('Reviews array is required');
    }

    const analyzedReviews = [];

    for (const review of reviews) {
      const prompt = `Analyze this customer review comprehensively and provide:
1. Sentiment (positive, negative, or neutral)
2. Up to 5 relevant tags/categories (e.g., "service", "food quality", "cleanliness", "staff", "wait time", "pricing", "atmosphere")
3. Key issues mentioned (if negative/neutral)
4. Suggestions for improvement based on the review

Review: "${review.text}"
Rating: ${review.rating}/5 stars

Return ONLY a JSON object with this exact format:
{
  "sentiment": "positive|negative|neutral",
  "tags": ["tag1", "tag2", "tag3", "tag4", "tag5"],
  "issues": ["issue1", "issue2"],
  "suggestions": ["suggestion1", "suggestion2"]
}`;

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-2025-04-14',
          messages: [
            { role: 'system', content: 'You are an AI that analyzes customer reviews. Return only valid JSON.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.3,
          max_tokens: 300,
        }),
      });

      if (!response.ok) {
        console.error(`OpenAI API error: ${response.status}`);
        // Use fallback analysis
        analyzedReviews.push({
          ...review,
          ai_sentiment: review.rating >= 4 ? 'positive' : review.rating <= 2 ? 'negative' : 'neutral',
          ai_tags: ['general']
        });
        continue;
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      try {
        const analysis = JSON.parse(aiResponse);
        analyzedReviews.push({
          ...review,
          ai_sentiment: analysis.sentiment,
          ai_tags: analysis.tags || [],
          ai_issues: analysis.issues || [],
          ai_suggestions: analysis.suggestions || []
        });
      } catch (parseError) {
        // Fallback if JSON parsing fails
        analyzedReviews.push({
          ...review,
          ai_sentiment: review.rating >= 4 ? 'positive' : review.rating <= 2 ? 'negative' : 'neutral',
          ai_tags: ['general'],
          ai_issues: [],
          ai_suggestions: []
        });
      }
    }

    return new Response(JSON.stringify({ reviews: analyzedReviews }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-review-analysis function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});