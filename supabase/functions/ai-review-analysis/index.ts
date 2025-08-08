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

    // Handle both direct reviews array and sentiment analysis requests
    if (body.action === 'generate_sentiment_analysis') {
      // Get reviews from database based on parameters
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseKey);

      let query = supabase
        .from('saved_reviews')
        .select('*')
        .gte('review_date', body.start_date)
        .lte('review_date', body.end_date);

      if (body.location_id) {
        query = query.eq('location_id', body.location_id);
      }

      const { data: reviews, error } = await query;
      if (error) throw error;

      if (!reviews || reviews.length === 0) {
        return new Response(JSON.stringify({ message: 'No reviews found for analysis' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      // Analyze only reviews without AI analysis
      const reviewsToAnalyze = reviews.filter(review => !review.ai_sentiment);
      
      if (reviewsToAnalyze.length === 0) {
        return new Response(JSON.stringify({ message: 'All reviews already analyzed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      await analyzeAndUpdateReviews(supabase, reviewsToAnalyze);

      return new Response(JSON.stringify({ message: 'Analysis completed', analyzed_count: reviewsToAnalyze.length }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Handle direct reviews array for analysis
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

async function analyzeAndUpdateReviews(supabase: any, reviews: any[]) {
  for (const review of reviews) {
    try {
      const prompt = `Analyze this customer review comprehensively and provide:
1. Sentiment (positive, negative, or neutral)
2. Up to 5 relevant tags/categories (e.g., "service", "food quality", "cleanliness", "staff", "wait time", "pricing", "atmosphere")
3. Key issues mentioned (if negative/neutral)
4. Suggestions for improvement based on the review

Review: "${review.text || 'No text provided'}"
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
          'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
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

      let analysis = {
        sentiment: review.rating >= 4 ? 'positive' : review.rating <= 2 ? 'negative' : 'neutral',
        tags: ['general'],
        issues: [],
        suggestions: []
      };

      if (response.ok) {
        try {
          const data = await response.json();
          const aiResponse = data.choices[0].message.content;
          analysis = JSON.parse(aiResponse);
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
        }
      } else {
        console.error(`OpenAI API error: ${response.status}`);
      }

      // Update the review with AI analysis
      await supabase
        .from('saved_reviews')
        .update({
          ai_sentiment: analysis.sentiment,
          ai_tags: analysis.tags || [],
          ai_issues: analysis.issues || [],
          ai_suggestions: analysis.suggestions || [],
          ai_analyzed_at: new Date().toISOString()
        })
        .eq('id', review.id);

    } catch (error) {
      console.error(`Error analyzing review ${review.id}:`, error);
    }
  }
}