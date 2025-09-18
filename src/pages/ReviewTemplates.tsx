import { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { Navigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Plus, Edit, Trash2, Copy, FileText, Star, Heart, MessageSquare, ThumbsUp, AlertCircle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { FeatureGate } from "@/components/UpgradePrompt";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

interface ReviewTemplate {
  id: string;
  name: string;
  category: 'positive' | 'negative' | 'neutral' | 'thank_you' | 'apology' | 'follow_up';
  content: string;
  variables: string[];
  is_default: boolean;
  is_prebuilt: boolean;
  created_at: string;
  updated_at: string;
}

const categoryIcons = {
  positive: Star,
  negative: AlertCircle,
  neutral: MessageSquare,
  thank_you: Heart,
  apology: AlertCircle,
  follow_up: CheckCircle,
};

const categoryColors = {
  positive: "bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400",
  negative: "bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400",
  neutral: "bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-400",
  thank_you: "bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400",
  apology: "bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400",
  follow_up: "bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400",
};

const ReviewTemplates = () => {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const { canUseReviewTemplates, maxCustomTemplates } = usePlanFeatures();
  const [templates, setTemplates] = useState<ReviewTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ReviewTemplate | null>(null);
  const [newTemplate, setNewTemplate] = useState({
    name: "",
    category: "positive" as ReviewTemplate['category'],
    content: "",
  });

  useEffect(() => {
    if (user && canUseReviewTemplates) {
      fetchTemplates();
    }
  }, [user, canUseReviewTemplates]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
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
        description: "Failed to load review templates",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('review_templates')
        .insert({
          user_id: user.id,
          name: newTemplate.name,
          category: newTemplate.category,
          content: newTemplate.content,
          variables: extractVariables(newTemplate.content),
          is_prebuilt: false,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      setNewTemplate({ name: "", category: "positive", content: "" });
      setIsCreateDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Template created successfully",
      });
    } catch (error) {
      console.error('Error creating template:', error);
      toast({
        title: "Error",
        description: "Failed to create template",
        variant: "destructive",
      });
    }
  };

  const handleUpdateTemplate = async () => {
    if (!editingTemplate) return;

    try {
      const { data, error } = await supabase
        .from('review_templates')
        .update({
          name: editingTemplate.name,
          category: editingTemplate.category,
          content: editingTemplate.content,
          variables: extractVariables(editingTemplate.content),
        })
        .eq('id', editingTemplate.id)
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => prev.map(t => t.id === editingTemplate.id ? data : t));
      setEditingTemplate(null);
      setIsEditDialogOpen(false);
      
      toast({
        title: "Success",
        description: "Template updated successfully",
      });
    } catch (error) {
      console.error('Error updating template:', error);
      toast({
        title: "Error",
        description: "Failed to update template",
        variant: "destructive",
      });
    }
  };

  const handleDeleteTemplate = async (templateId: string) => {
    try {
      const { error } = await supabase
        .from('review_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      setTemplates(prev => prev.filter(t => t.id !== templateId));
      
      toast({
        title: "Success",
        description: "Template deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting template:', error);
      toast({
        title: "Error",
        description: "Failed to delete template",
        variant: "destructive",
      });
    }
  };

  const handleCopyTemplate = async (template: ReviewTemplate) => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('review_templates')
        .insert({
          user_id: user.id,
          name: `${template.name} (Copy)`,
          category: template.category,
          content: template.content,
          variables: template.variables,
          is_prebuilt: false,
        })
        .select()
        .single();

      if (error) throw error;

      setTemplates(prev => [data, ...prev]);
      
      toast({
        title: "Success",
        description: "Template copied successfully",
      });
    } catch (error) {
      console.error('Error copying template:', error);
      toast({
        title: "Error",
        description: "Failed to copy template",
        variant: "destructive",
      });
    }
  };

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{([^}]+)\}/g);
    return matches ? [...new Set(matches.map(match => match.slice(1, -1)))] : [];
  };

  const filteredTemplates = templates.filter(template => {
    const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.content.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const customTemplates = templates.filter(t => !t.is_prebuilt);
  const prebuiltTemplates = templates.filter(t => t.is_prebuilt);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">Loading templates...</p>
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
              <h1 className="text-xl font-semibold">Review Templates</h1>
            </div>
            <div className="flex items-center space-x-4 ml-auto">
              <FeatureGate feature="Review Templates" variant="inline">
                <Button onClick={() => setIsCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              </FeatureGate>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-8 pt-6">
            <FeatureGate feature="Review Templates" variant="card">
              {/* Filters */}
              <Card>
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <Input
                        placeholder="Search templates..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full"
                      />
                    </div>
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger className="w-full lg:w-48">
                        <SelectValue placeholder="Filter by category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="positive">Positive</SelectItem>
                        <SelectItem value="negative">Negative</SelectItem>
                        <SelectItem value="neutral">Neutral</SelectItem>
                        <SelectItem value="thank_you">Thank You</SelectItem>
                        <SelectItem value="apology">Apology</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              {/* Custom Templates */}
              {customTemplates.length > 0 && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold">Your Custom Templates</h2>
                    <Badge variant="outline">{customTemplates.length} templates</Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {customTemplates
                      .filter(template => {
                        const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
                        const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                             template.content.toLowerCase().includes(searchTerm.toLowerCase());
                        return matchesCategory && matchesSearch;
                      })
                      .map((template) => {
                        const IconComponent = categoryIcons[template.category];
                        return (
                          <Card key={template.id} className="relative">
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-2">
                                  <IconComponent className="h-4 w-4" />
                                  <CardTitle className="text-sm">{template.name}</CardTitle>
                                </div>
                                <Badge className={categoryColors[template.category]}>
                                  {template.category.replace('_', ' ')}
                                </Badge>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                                {template.content}
                              </p>
                              {template.variables.length > 0 && (
                                <div className="flex flex-wrap gap-1 mb-4">
                                  {template.variables.map((variable) => (
                                    <Badge key={variable} variant="secondary" className="text-xs">
                                      {`{${variable}}`}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex space-x-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => {
                                      setEditingTemplate(template);
                                      setIsEditDialogOpen(true);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="ghost">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Template</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{template.name}"? This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                          onClick={() => handleDeleteTemplate(template.id)}
                                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                        >
                                          Delete
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                                <span className="text-xs text-muted-foreground">
                                  {new Date(template.updated_at).toLocaleDateString()}
                                </span>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                  </div>
                </div>
              )}

              {/* Prebuilt Templates */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold">Pre-built Templates</h2>
                  <Badge variant="outline">{prebuiltTemplates.length} templates</Badge>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {prebuiltTemplates
                    .filter(template => {
                      const matchesCategory = selectedCategory === "all" || template.category === selectedCategory;
                      const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                                           template.content.toLowerCase().includes(searchTerm.toLowerCase());
                      return matchesCategory && matchesSearch;
                    })
                    .map((template) => {
                      const IconComponent = categoryIcons[template.category];
                      return (
                        <Card key={template.id} className="relative">
                          <CardHeader className="pb-3">
                            <div className="flex items-start justify-between">
                              <div className="flex items-center space-x-2">
                                <IconComponent className="h-4 w-4" />
                                <CardTitle className="text-sm">{template.name}</CardTitle>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Badge className={categoryColors[template.category]}>
                                  {template.category.replace('_', ' ')}
                                </Badge>
                                {template.is_default && (
                                  <Badge variant="outline" className="text-xs">
                                    Default
                                  </Badge>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                              {template.content}
                            </p>
                            {template.variables.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-4">
                                {template.variables.map((variable) => (
                                  <Badge key={variable} variant="secondary" className="text-xs">
                                    {`{${variable}}`}
                                  </Badge>
                                ))}
                              </div>
                            )}
                            <div className="flex items-center justify-between">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleCopyTemplate(template)}
                              >
                                <Copy className="h-3 w-3 mr-1" />
                                Copy
                              </Button>
                              <span className="text-xs text-muted-foreground">
                                Pre-built
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                </div>
              </div>

              {filteredTemplates.length === 0 && (
                <Card>
                  <CardContent className="p-8 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">No templates found</h3>
                    <p className="text-muted-foreground mb-4">
                      {searchTerm || selectedCategory !== "all"
                        ? "Try adjusting your search or filters."
                        : "Create your first custom template to get started."}
                    </p>
                    {!searchTerm && selectedCategory === "all" && (
                      <Button onClick={() => setIsCreateDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Create Template
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </FeatureGate>
          </div>
        </SidebarInset>
      </div>

      {/* Create Template Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create New Template</DialogTitle>
            <DialogDescription>
              Create a custom review response template with variables.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="template-name">Template Name</Label>
              <Input
                id="template-name"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Thank You for Positive Review"
              />
            </div>
            <div>
              <Label htmlFor="template-category">Category</Label>
              <Select value={newTemplate.category} onValueChange={(value: ReviewTemplate['category']) => setNewTemplate(prev => ({ ...prev, category: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="positive">Positive</SelectItem>
                  <SelectItem value="negative">Negative</SelectItem>
                  <SelectItem value="neutral">Neutral</SelectItem>
                  <SelectItem value="thank_you">Thank You</SelectItem>
                  <SelectItem value="apology">Apology</SelectItem>
                  <SelectItem value="follow_up">Follow Up</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="template-content">Template Content</Label>
              <Textarea
                id="template-content"
                value={newTemplate.content}
                onChange={(e) => setNewTemplate(prev => ({ ...prev, content: e.target.value }))}
                placeholder="Enter your template content. Use {variable_name} for dynamic content..."
                rows={6}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use variables like {`{customer_name}`}, {`{business_name}`} for dynamic content.
              </p>
            </div>
            {newTemplate.content && (
              <div>
                <Label>Detected Variables</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {extractVariables(newTemplate.content).map((variable) => (
                    <Badge key={variable} variant="secondary" className="text-xs">
                      {`{${variable}}`}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleCreateTemplate}
              disabled={!newTemplate.name || !newTemplate.content}
            >
              Create Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Template Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Template</DialogTitle>
            <DialogDescription>
              Update your custom review response template.
            </DialogDescription>
          </DialogHeader>
          {editingTemplate && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="edit-template-name">Template Name</Label>
                <Input
                  id="edit-template-name"
                  value={editingTemplate.name}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, name: e.target.value } : null)}
                  placeholder="e.g., Thank You for Positive Review"
                />
              </div>
              <div>
                <Label htmlFor="edit-template-category">Category</Label>
                <Select value={editingTemplate.category} onValueChange={(value: ReviewTemplate['category']) => setEditingTemplate(prev => prev ? { ...prev, category: value } : null)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="positive">Positive</SelectItem>
                    <SelectItem value="negative">Negative</SelectItem>
                    <SelectItem value="neutral">Neutral</SelectItem>
                    <SelectItem value="thank_you">Thank You</SelectItem>
                    <SelectItem value="apology">Apology</SelectItem>
                    <SelectItem value="follow_up">Follow Up</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-template-content">Template Content</Label>
                <Textarea
                  id="edit-template-content"
                  value={editingTemplate.content}
                  onChange={(e) => setEditingTemplate(prev => prev ? { ...prev, content: e.target.value } : null)}
                  placeholder="Enter your template content. Use {variable_name} for dynamic content..."
                  rows={6}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Use variables like {`{customer_name}`}, {`{business_name}`} for dynamic content.
                </p>
              </div>
              {editingTemplate.content && (
                <div>
                  <Label>Detected Variables</Label>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {extractVariables(editingTemplate.content).map((variable) => (
                      <Badge key={variable} variant="secondary" className="text-xs">
                        {`{${variable}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpdateTemplate}
              disabled={!editingTemplate?.name || !editingTemplate?.content}
            >
              Update Template
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
};

export default ReviewTemplates;
