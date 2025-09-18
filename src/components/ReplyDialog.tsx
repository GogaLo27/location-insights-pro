// /src/components/ReplyDialog.tsx
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Reply, Bot, User, Star, Sparkles, FileText, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { FeatureGate } from "@/components/UpgradePrompt";

interface Review {
  id: string;
  google_review_id: string;
  author_name: string;
  rating: number;
  text: string | null;
  ai_sentiment: "positive" | "negative" | "neutral" | null;
  location_id: string;
}

interface ReviewTemplate {
  id: string;
  name: string;
  category: 'positive' | 'negative' | 'neutral' | 'thank_you' | 'apology' | 'follow_up';
  content: string;
  variables: string[];
  is_default: boolean;
  is_prebuilt: boolean;
}

interface ReplyDialogProps {
  review: Review;
  onReplySubmitted: () => void; // will call with fetchReviews(true) in the parent
}

const ReplyDialog = ({ review, onReplySubmitted }: ReplyDialogProps) => {
  const { toast } = useToast();
  const { canUseAIReplyGeneration, canUseReviewTemplates } = usePlanFeatures();
  const [open, setOpen] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [mode, setMode] = useState<"manual" | "ai" | "template">("manual");
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>("");
  const [loadingTemplates, setLoadingTemplates] = useState(false);

  // Fetch templates when dialog opens and user has access
  useEffect(() => {
    if (open && canUseReviewTemplates) {
      fetchTemplates();
    }
  }, [open, canUseReviewTemplates]);

  const fetchTemplates = async () => {
    try {
      setLoadingTemplates(true);
      const { data, error } = await supabase
        .from('review_templates')
        .select('*')
        .order('is_prebuilt', { ascending: false })
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast({
        title: "Error",
        description: "Failed to load templates",
        variant: "destructive",
      });
    } finally {
      setLoadingTemplates(false);
    }
  };

  const processTemplate = (template: ReviewTemplate): string => {
    let processedContent = template.content;
    
    // Replace variables with actual values
    const variables = {
      customer_name: review.author_name || 'Valued Customer',
      business_name: 'Our Business', // You might want to get this from location data
      rating: review.rating?.toString() || '5',
      sentiment: review.ai_sentiment || 'neutral',
    };

    // Replace all variables in the template
    Object.entries(variables).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      processedContent = processedContent.replace(regex, value);
    });

    return processedContent;
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const processedContent = processTemplate(template);
      setReplyText(processedContent);
    }
  };

  // Prefer prop text; if empty, try DB (saved_reviews then reviews)
  const fetchReviewTextIfMissing = async (): Promise<string> => {
    const propText = (review?.text ?? "").trim();
    if (propText) return propText;

    const { data: saved, error: errSaved } = await supabase
      .from("saved_reviews")
      .select("text")
      .eq("google_review_id", review.google_review_id)
      .eq("location_id", review.location_id)
      .maybeSingle();
    if (!errSaved && saved?.text?.trim()) return saved.text.trim();

    const { data: base, error: errBase } = await supabase
      .from("reviews")
      .select("text")
      .eq("google_review_id", review.google_review_id)
      .eq("location_id", review.location_id)
      .maybeSingle();
    if (!errBase && base?.text?.trim()) return base.text.trim();

    return "";
  };

  const generateAIReply = async () => {
    setGenerating(true);
    try {
      const text = await fetchReviewTextIfMissing();
      const safeText = text || "(no written text)";
      const safeAuthor = review?.author_name ?? "Anonymous";
      const safeRating = review?.rating ?? "N/A";
      const safeSentiment = review?.ai_sentiment || "neutral";

      const prompt = `Generate a professional business response to this ${safeRating}-star review:

Review: "${safeText}"
Reviewer: ${safeAuthor}
Rating: ${safeRating}/5 stars
Sentiment: ${safeSentiment}

Please write a thoughtful, professional response that:
- Thanks the customer for their feedback
- Addresses their specific concerns if it's a negative review
- Maintains a positive, professional tone
- Is concise but personal
- Reflects well on the business

Keep the response under 150 words.`.trim();

      const { data, error } = await supabase.functions.invoke("generate-ai-reply", {
        body: { prompt },
      });
      console.log("generate-ai-reply result", { data, error });

      if (error) throw error;

      const reply = typeof data === "string" ? data : (data?.reply ?? "");
      if (!reply) throw new Error((data as any)?.error || "AI reply not available.");

      setReplyText(reply);
      toast({ title: "AI Reply Generated", description: "You can edit the response before sending." });
    } catch (error) {
      console.error("Error generating AI reply:", error);
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
          locationId: review.location_id || review.google_review_id.split("/")[0],
          review_id: review.google_review_id,
          replyText: replyText,
        },
        headers: {
          Authorization: `Bearer ${supabaseJwt}`,
          "X-Google-Token": googleAccessToken,
        },
      });

      if (error) throw error;

      toast({ title: "Success", description: "Reply sent successfully!" });
      setOpen(false);
      setReplyText("");
      setMode("manual");
      setSelectedTemplate("");
      onReplySubmitted(); // parent will force a fresh fetch
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

  const handleDialogClose = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      // Reset state when dialog closes
      setReplyText("");
      setMode("manual");
      setSelectedTemplate("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogClose}>
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
                  className={`w-4 h-4 ${i < review.rating ? "text-accent fill-current" : "text-muted-foreground"}`}
                />
              ))}
            </div>
          </div>
          <p className="text-muted-foreground italic">
            "{(review?.text ?? "").trim() || "(no written text)"}"
          </p>
        </div>

        {/* Mode Selection */}
        <div className="flex gap-2">
          <Button variant={mode === "manual" ? "default" : "outline"} onClick={() => setMode("manual")} className="flex-1">
            <User className="w-4 h-4 mr-2" />
            Manual Reply
          </Button>
          <Button variant={mode === "ai" ? "default" : "outline"} onClick={() => setMode("ai")} className="flex-1">
            <Bot className="w-4 h-4 mr-2" />
            AI Generated
          </Button>
          <FeatureGate feature="Review Templates" variant="inline">
            <Button variant={mode === "template" ? "default" : "outline"} onClick={() => setMode("template")} className="flex-1">
              <FileText className="w-4 h-4 mr-2" />
              Templates
            </Button>
          </FeatureGate>
        </div>

        {/* AI Generation */}
        {mode === "ai" && !replyText && (
          <FeatureGate feature="AI Reply Generation" variant="modal">
            <div className="text-center py-6">
              <div className="mb-4">
                <Sparkles className="w-12 h-12 mx-auto text-accent mb-2" />
                <p className="text-muted-foreground">Generate a professional response using AI</p>
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
          </FeatureGate>
        )}

        {/* Template Selection */}
        {mode === "template" && (
          <FeatureGate feature="Review Templates" variant="modal">
            <div className="space-y-4">
              <div className="text-center py-4">
                <FileText className="w-12 h-12 mx-auto text-accent mb-2" />
                <p className="text-muted-foreground">Choose a professional response template</p>
              </div>
              
              {loadingTemplates ? (
                <div className="text-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-muted-foreground">Loading templates...</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a template..." />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.map((template) => (
                        <SelectItem key={template.id} value={template.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{template.name}</span>
                            <div className="flex items-center gap-2 ml-2">
                              <Badge variant="outline" className="text-xs">
                                {template.category.replace('_', ' ')}
                              </Badge>
                              {template.is_default && (
                                <Badge variant="secondary" className="text-xs">
                                  Default
                                </Badge>
                              )}
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  
                  {selectedTemplate && (
                    <div className="bg-muted/50 p-3 rounded-lg border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Template Preview:</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const template = templates.find(t => t.id === selectedTemplate);
                            if (template) {
                              const processedContent = processTemplate(template);
                              setReplyText(processedContent);
                            }
                          }}
                        >
                          <Copy className="w-3 h-3 mr-1" />
                          Use Template
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {templates.find(t => t.id === selectedTemplate)?.content}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </FeatureGate>
        )}

        {/* Reply Input */}
        {(mode === "manual" || mode === "template" || replyText) && (
          <div className="space-y-3">
            <label className="text-sm font-medium">Your Reply</label>
            <Textarea
              placeholder={
                mode === "template" 
                  ? "Select a template above or write your own response..." 
                  : "Write your professional response..."
              }
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              className="min-h-32 border-accent/20 focus:border-accent"
              maxLength={500}
            />
            <div className="flex justify-between items-center">
              <span className="text-sm text-muted-foreground">{replyText.length}/500 characters</span>
              {mode === "ai" && replyText && (
                <FeatureGate feature="AI Reply Generation" variant="inline">
                  <Button variant="ghost" size="sm" onClick={generateAIReply} disabled={generating}>
                    <Sparkles className="w-4 h-4 mr-1" />
                    Regenerate
                  </Button>
                </FeatureGate>
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
