import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

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
    console.log('🤖 AI Analysis Request:', body);

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // ============================================
    // BATCH PROCESSING - Analyze multiple reviews in one API call
    // ============================================
    if (body.action === 'analyze_batch') {
      const { reviews, job_id } = body;
      
      if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
        throw new Error('Reviews array is required');
      }

      console.log(`📦 Batch analyzing ${reviews.length} reviews`);
      
      const results = await analyzeBatchReviews(reviews);
      
      // Update progress if job_id provided
      if (job_id) {
        await supabase.rpc('update_ai_job_progress', {
          p_job_id: job_id,
          p_processed_count: results.length,
          p_failed_count: 0
        });
      }
      
      return new Response(JSON.stringify({ 
        success: true,
        analyzed: results.length,
        reviews: results 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ============================================
    // LEGACY: Single review processing (for backwards compatibility)
    // ============================================
    if (body.reviews && Array.isArray(body.reviews)) {
      console.log(`⚠️ Legacy mode: Processing ${body.reviews.length} reviews sequentially`);
      const analyzedReviews = [];

      // Process in batches of 10
      for (let i = 0; i < body.reviews.length; i += 10) {
        const batch = body.reviews.slice(i, i + 10);
        const batchResults = await analyzeBatchReviews(batch);
        analyzedReviews.push(...batchResults);
      }

      return new Response(JSON.stringify({ reviews: analyzedReviews }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    throw new Error('Invalid request format');
    
  } catch (error) {
    console.error('❌ Error in ai-review-analysis:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

// ============================================
// BATCH ANALYSIS - 10 reviews per API call
// Cost: 90% reduction, Speed: 10x faster
// ============================================

async function analyzeBatchReviews(reviews: any[]) {
  const BATCH_SIZE = 10;
  const results = [];

  // Process in chunks of 10
  for (let i = 0; i < reviews.length; i += BATCH_SIZE) {
    const batch = reviews.slice(i, i + BATCH_SIZE);
    
    // Separate reviews with text from those without
    const reviewsWithText = [];
    const reviewsWithoutText = [];
    
    batch.forEach(review => {
      if (review.text && review.text.trim().length > 0) {
        reviewsWithText.push(review);
      } else {
        // Reviews without text - use rating-based sentiment immediately
        reviewsWithoutText.push({
          ...review,
          ai_sentiment: getSentimentFromRating(review.rating),
          ai_tags: ['rating only'],
          ai_issues: [],
          ai_suggestions: []
        });
      }
    });
    
    // Add reviews without text to results (no AI needed)
    results.push(...reviewsWithoutText);
    
    console.log(`📊 Batch ${Math.floor(i/BATCH_SIZE) + 1}: ${reviewsWithText.length} with text, ${reviewsWithoutText.length} rating-only`);
    
    // If no reviews with text, skip AI call
    if (reviewsWithText.length === 0) {
      console.log('⚡ Skipping AI call - all reviews are rating-only');
      continue;
    }
    
    // Create batch prompt only for reviews with text
    const batchPrompt = createBatchPrompt(reviewsWithText);
    
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo', // CHANGED: GPT-4 → GPT-3.5 (10x cheaper, 2x faster)
          messages: [
            { 
              role: 'system', 
              content: 'You are an AI that analyzes customer reviews in batches. Return only valid JSON array.' 
            },
            { role: 'user', content: batchPrompt }
          ],
          temperature: 0.3,
          max_tokens: 1500, // Enough for 10 reviews
        }),
      });

      if (!response.ok) {
        console.error(`❌ OpenAI API error: ${response.status}`);
        // Fallback: Use rating-based sentiment for reviews with text
        reviewsWithText.forEach(review => {
          results.push({
            ...review,
            ai_sentiment: getSentimentFromRating(review.rating),
            ai_tags: ['general'],
            ai_issues: [],
            ai_suggestions: []
          });
        });
        continue;
      }

      const data = await response.json();
      const aiResponse = data.choices[0].message.content;

      try {
        const analyses = JSON.parse(aiResponse);
        
        // Match analyses with reviews (only for reviews with text)
        reviewsWithText.forEach((review, index) => {
          const analysis = analyses[index] || {};
          results.push({
            ...review,
            ai_sentiment: analysis.sentiment || getSentimentFromRating(review.rating),
            ai_tags: analysis.tags || ['general'],
            ai_issues: analysis.issues || [],
            ai_suggestions: analysis.suggestions || []
          });
        });
      } catch (parseError) {
        console.error('❌ Failed to parse batch response:', parseError);
        // Fallback for reviews with text
        reviewsWithText.forEach(review => {
          results.push({
            ...review,
            ai_sentiment: getSentimentFromRating(review.rating),
            ai_tags: ['general'],
            ai_issues: [],
            ai_suggestions: []
          });
        });
      }
      
    } catch (error) {
      console.error('❌ Batch analysis error:', error);
      // Fallback for reviews with text only
      reviewsWithText.forEach(review => {
        results.push({
          ...review,
          ai_sentiment: getSentimentFromRating(review.rating),
          ai_tags: ['general'],
          ai_issues: [],
          ai_suggestions: []
        });
      });
    }
    
    // Small delay between batches to avoid rate limits
    if (i + BATCH_SIZE < reviews.length) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }

  return results;
}

// ============================================
// CREATE BATCH PROMPT - Analyze 10 reviews in one call
// ============================================

function createBatchPrompt(reviews: any[]): string {
  const reviewsText = reviews.map((review, index) => 
    `Review ${index + 1}:
Text: "${review.text || 'No text provided'}"
Rating: ${review.rating}/5 stars`
  ).join('\n\n');

  return `Analyze these ${reviews.length} customer reviews. For each review, provide:
1. Sentiment (positive, negative, or neutral)
2. 3-5 specific tags from: "service quality", "food quality", "staff behavior", "cleanliness", "wait time", "pricing", "atmosphere", "location", "parking", "value for money", "customer service", "product quality", "delivery", "facilities"
3. Key issues (if negative/neutral)
4. Actionable suggestions

${reviewsText}

Return ONLY a JSON array with ${reviews.length} objects in this exact format:
[
  {
    "sentiment": "positive|negative|neutral",
    "tags": ["tag1", "tag2", "tag3"],
    "issues": ["issue1", "issue2"],
    "suggestions": ["suggestion1", "suggestion2"]
  }
]`;
}

// ============================================
// FALLBACK: Sentiment from rating
// ============================================

function getSentimentFromRating(rating: number): string {
  if (rating >= 4) return 'positive';
  if (rating <= 2) return 'negative';
  return 'neutral';
}
