import React, { useState } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { useLocation } from "react-router-dom";
import { Navigate } from "react-router-dom";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, CheckCircle, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FeedbackForm {
  feedback_type: 'bug_report' | 'feature_request' | 'general_feedback' | 'improvement_suggestion';
  subject: string;
  message: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

const Feedback = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const location = useLocation();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [form, setForm] = useState<FeedbackForm>({
    feedback_type: 'general_feedback',
    subject: '',
    message: '',
    priority: 'medium'
  });

  const feedbackTypes = [
    { value: 'bug_report', label: 'Bug Report', description: 'Report a bug or issue you encountered' },
    { value: 'feature_request', label: 'Feature Request', description: 'Suggest a new feature or improvement' },
    { value: 'general_feedback', label: 'General Feedback', description: 'Share your thoughts and suggestions' },
    { value: 'improvement_suggestion', label: 'Improvement Suggestion', description: 'Suggest improvements to existing features' }
  ];

  const priorityLevels = [
    { value: 'low', label: 'Low', color: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200' },
    { value: 'medium', label: 'Medium', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400' },
    { value: 'urgent', label: 'Urgent', color: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400' }
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit feedback",
        variant: "destructive",
      });
      return;
    }

    if (!form.subject.trim() || !form.message.trim()) {
      toast({
        title: "Validation Error",
        description: "Subject and message are required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('feedback')
        .insert({
          user_id: user.id,
          user_email: user.email,
          user_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Anonymous',
          feedback_type: form.feedback_type,
          subject: form.subject.trim(),
          message: form.message.trim(),
          priority: form.priority,
          page_url: location.pathname,
          user_agent: navigator.userAgent,
        });

      if (error) throw error;

      setSubmitted(true);
      setForm({
        feedback_type: 'general_feedback',
        subject: '',
        message: '',
        priority: 'medium'
      });

      toast({
        title: "Success",
        description: "Thank you for your feedback! We'll review it and get back to you if needed.",
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast({
        title: "Error",
        description: "Failed to submit feedback. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setSubmitted(false);
    setForm({
      feedback_type: 'general_feedback',
      subject: '',
      message: '',
      priority: 'medium'
    });
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-4">
              <h1 className="text-xl font-semibold">Feedback</h1>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-8 pt-6">
            <div className="max-w-4xl mx-auto">
              <div className="mb-8">
                <h2 className="text-2xl font-bold mb-2">Share Your Feedback</h2>
                <p className="text-muted-foreground">
                  Help us improve by sharing your thoughts, reporting bugs, or suggesting new features.
                </p>
              </div>

              {submitted ? (
                <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/20">
                  <CardContent className="p-8 text-center">
                    <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold mb-2 text-green-800 dark:text-green-200">
                      Thank You for Your Feedback!
                    </h3>
                    <p className="text-green-700 dark:text-green-300 mb-6">
                      We've received your feedback and will review it carefully. If we need any additional information, we'll reach out to you.
                    </p>
                    <Button onClick={handleReset} variant="outline">
                      Submit Another Feedback
                    </Button>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <MessageCircle className="w-5 h-5" />
                      <span>Feedback Form</span>
                    </CardTitle>
                    <CardDescription>
                      Please provide as much detail as possible to help us understand your feedback better.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="feedback_type">Feedback Type</Label>
                          <Select 
                            value={form.feedback_type} 
                            onValueChange={(value: FeedbackForm['feedback_type']) => 
                              setForm(prev => ({ ...prev, feedback_type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {feedbackTypes.map((type) => (
                                <SelectItem key={type.value} value={type.value}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">{type.label}</span>
                                    <span className="text-xs text-muted-foreground">{type.description}</span>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="priority">Priority</Label>
                          <Select 
                            value={form.priority} 
                            onValueChange={(value: FeedbackForm['priority']) => 
                              setForm(prev => ({ ...prev, priority: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {priorityLevels.map((priority) => (
                                <SelectItem key={priority.value} value={priority.value}>
                                  <div className="flex items-center space-x-2">
                                    <Badge className={priority.color}>
                                      {priority.label}
                                    </Badge>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Input
                          id="subject"
                          value={form.subject}
                          onChange={(e) => setForm(prev => ({ ...prev, subject: e.target.value }))}
                          placeholder="Brief description of your feedback"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="message">Message</Label>
                        <Textarea
                          id="message"
                          value={form.message}
                          onChange={(e) => setForm(prev => ({ ...prev, message: e.target.value }))}
                          placeholder="Please provide detailed information about your feedback..."
                          rows={8}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Include steps to reproduce for bug reports, or detailed descriptions for feature requests.
                        </p>
                      </div>

                      <div className="flex items-center space-x-2 p-4 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                        <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <p className="text-sm text-blue-800 dark:text-blue-200">
                          Your feedback will be reviewed by our team. We may contact you for additional information if needed.
                        </p>
                      </div>

                      <div className="flex justify-end space-x-4">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleReset}
                          disabled={loading}
                        >
                          Reset
                        </Button>
                        <Button type="submit" disabled={loading}>
                          {loading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <Send className="w-4 h-4 mr-2" />
                              Submit Feedback
                            </>
                          )}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              )}

              <Card className="mt-8">
                <CardHeader>
                  <CardTitle className="text-lg">Feedback Guidelines</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-medium mb-2">Bug Reports</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Describe what happened</li>
                        <li>• Include steps to reproduce</li>
                        <li>• Mention your browser/device</li>
                        <li>• Add screenshots if possible</li>
                      </ul>
                    </div>
                    <div>
                      <h4 className="font-medium mb-2">Feature Requests</h4>
                      <ul className="text-sm text-muted-foreground space-y-1">
                        <li>• Explain the problem it solves</li>
                        <li>• Describe your ideal solution</li>
                        <li>• Consider alternative approaches</li>
                        <li>• Explain the expected benefits</li>
                      </ul>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default Feedback;
