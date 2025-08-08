import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Reply, Bot, User, Star, Sparkles } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface Review {
  id: string;
  google_review_id: string;
  author_name: string;
  rating: number;
  text: string | null;
  ai_sentiment: "positive" | "negative" | "neutral" | null;
}

interface ReplyDialogProps {
  review: Review;
  onReplySubmitted: () => void;
}

const ReplyDialog = ({ review, onReplySubmitted }: ReplyDialogProps) => {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const generateAIReply = async () => {
    setGenerating(true);
    try {
      const prompt = `Generate a professional business response to this ${review.rating}-star review:

Review: "${review.text}"
Reviewer: ${review.author_name}
Rating: ${review.rating}/5 stars
Sentiment: ${review.ai_sentiment || 'neutral'}

Please write a thoughtful, professional response that:
- Thanks the customer for their feedback
- Addresses their specific concerns if it's a negative review
- Maintains a positive, professional tone
- Is concise but personal
- Reflects well on the business

Keep the response under 150 words.`;

      const { data, error } = await supabase.functions.invoke('generate-ai-reply', {
        body: { prompt },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (error) throw error;
      
      setReplyText(data.reply);
      toast({
        title: "AI Reply Generated",
        description: "You can edit the response before sending.",
      });
    } catch (error) {
      console.error('Error generating AI reply:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI reply. Please try manual reply.",
        variant: "destructive",
      });
    } finally {
      setGenerating(false);
    }
  };

  const getSessionTokens = async () => {
    let { data: { session } } = await supabase.auth.getSession();
    if (!session?.provider_token) {
      await supabase.auth.refreshSession();
      ({ data: { session } } = await supabase.auth.getSession());
    }
    return {
      supabaseJwt: session?.access_token || "",
      googleAccessToken: session?.provider_token || "",
    };
  };

  const handleSubmit = async () => {
    if (!replyText.trim()) {
      toast({
        title: "Error",
        description: "Please enter a reply message.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);
    try {
      const { supabaseJwt, googleAccessToken } = await getSessionTokens();
      if (!supabaseJwt || !googleAccessToken) throw new Error("Missing tokens");

      const { error } = await supabase.functions.invoke("google-business-api", {
        body: {
          action: "reply_to_review",
          review_id: review.google_review_id,
          reply_text: replyText,
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Reply sent successfully!",
      });
      
      setOpen(false);
      setReplyText("");
      setMode("manual");
      onReplySubmitted();
    } catch (error) {
      console.error("Error sending reply:", error);
      toast({
        title: "Error",
        description: "Failed to send reply. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case "positive": return "text-success";
      case "negative": return "text-destructive"; 
      case "neutral": return "text-muted-foreground";
      default: return "text-muted-foreground";
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="hover-scale">
          <Reply className="w-4 h-4 mr-2" />
          Reply
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Reply className="w-5 h-5 text-primary" />
            Reply to Review
          </DialogTitle>
        </DialogHeader>
        
        {/* Review Summary */}
        <div className="bg-muted/50 p-4 rounded-lg border border-accent/20">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="font-medium text-foreground">{review.author_name}</span>
              {review.ai_sentiment && (
                <Badge variant="outline" className={getSentimentColor(review.ai_sentiment)}>
                  {review.ai_sentiment}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1">
              {[...Array(5)].map((_, i) => (
                <Star
                  key={i}
                  className={`w-4 h-4 ${
                    i < review.rating
                      ? "text-accent fill-current"
                      : "text-muted-foreground"
                  }`}
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground italic">"{review.text}"</p>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2">
          <Button
            variant={mode === "manual" ? "default" : "outline"}
            onClick={() => setMode("manual")}
            className="flex-1"
          >
            <User className="w-4 h-4 mr-2" />
            Manual Reply
          </Button>
          <Button
            variant={mode === "ai" ? "default" : "outline"}
            onClick={() => setMode("ai")}
            className="flex-1"
          >
            <Bot className="w-4 h-4 mr-2" />
            AI Generated
          </Button>
        </div>

        {/* AI Generation */}
        {mode === "ai" && !replyText && (
          <div className="text-center py-6">
            <div className="mb-4">
              <Sparkles className="w-12 h-12 mx-auto text-accent mb-2" />
              <p className="text-muted-foreground">
                Generate a professional response using AI
              </p>
            </div>
            <Button 
              onClick={generateAIReply} 
              disabled={generating}
              className="bg-gradient-to-r from-primary to-accent text-primary-foreground hover:from-primary/90 hover:to-accent/90"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Reply
                </>
              )}
            </Button>
          </div>
        )}

        {/* Reply Input */}
        {(mode === "manual" || replyText) && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Your Reply</label>
            <Textarea
              placeholder="Write your professional response..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-32 border-accent/20 focus:border-accent"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">
                {replyText.length}/500 characters
              </span>
              {mode === "ai" && replyText && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={generateAIReply}
                  disabled={generating}
                >
                  <Sparkles className="w-4 h-4 mr-1" />
                  Regenerate
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={() => setOpen(false)} className="flex-1">
            Cancel
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!replyText.trim() || submitting}
            className="flex-1 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              "Send Reply"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ReplyDialog;