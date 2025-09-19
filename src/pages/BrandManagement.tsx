import React, { useState, useEffect } from "react";
import { useAuth } from "@/components/ui/auth-provider";
import { usePlanFeatures } from "@/hooks/usePlanFeatures";
import { AppSidebar } from "@/components/AppSidebar";
import LocationSelector from "@/components/LocationSelector";
import { UpgradePrompt } from "@/components/UpgradePrompt";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { Palette, Plus, Edit, Trash2, Upload, Image as ImageIcon, Building2, X } from "lucide-react";
import { Navigate } from "react-router-dom";

interface BrandProfile {
  id: string;
  brand_name: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  font_family: string;
  contact_email?: string;
  contact_phone?: string;
  website?: string;
  address?: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
}

export default function BrandManagement() {
  const { user, loading: authLoading } = useAuth();
  const { canUseReviewTemplates } = usePlanFeatures(); // Using review templates as proxy for Enterprise features
  const { toast } = useToast();
  
  const [brands, setBrands] = useState<BrandProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBrand, setEditingBrand] = useState<BrandProfile | null>(null);
  const [newBrand, setNewBrand] = useState({
    brand_name: "",
    primary_color: "#000000",
    secondary_color: "#666666",
    font_family: "Arial, sans-serif",
    contact_email: "",
    contact_phone: "",
    website: "",
    address: "",
    logo_url: ""
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Handle logo file selection
  const handleLogoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast({
          title: "File too large",
          description: "Logo file must be smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        toast({
          title: "Invalid file type",
          description: "Please select an image file",
          variant: "destructive",
        });
        return;
      }
      
      setLogoFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setLogoPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Upload logo to Supabase storage
  const uploadLogo = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${user?.id}/${Date.now()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from('brand-logos')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('brand-logos')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      throw error;
    }
  };

  // Fetch brands
  const fetchBrands = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('brand_profiles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBrands(data || []);
    } catch (error) {
      console.error('Error fetching brands:', error);
      toast({
        title: "Error",
        description: "Failed to load brand profiles",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Add brand
  const handleAddBrand = async () => {
    if (!user) return;

    if (!newBrand.brand_name.trim()) {
      toast({
        title: "Validation Error",
        description: "Brand name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsUploading(true);
      
      // Upload logo if selected
      let logoUrl = null;
      if (logoFile) {
        logoUrl = await uploadLogo(logoFile);
      }

      const { data, error } = await supabase
        .from('brand_profiles')
        .insert({
          user_id: user.id,
          brand_name: newBrand.brand_name.trim(),
          primary_color: newBrand.primary_color,
          secondary_color: newBrand.secondary_color,
          font_family: newBrand.font_family,
          contact_email: newBrand.contact_email.trim() || null,
          contact_phone: newBrand.contact_phone.trim() || null,
          website: newBrand.website.trim() || null,
          address: newBrand.address.trim() || null,
          logo_url: logoUrl,
        })
        .select()
        .single();

      if (error) throw error;

      setBrands([data, ...brands]);
      setNewBrand({
        brand_name: "",
        primary_color: "#000000",
        secondary_color: "#666666",
        font_family: "Arial, sans-serif",
        contact_email: "",
        contact_phone: "",
        website: "",
        address: "",
        logo_url: ""
      });
      setLogoFile(null);
      setLogoPreview(null);
      setIsAddDialogOpen(false);

      toast({
        title: "Success",
        description: "Brand profile created successfully",
      });
    } catch (error) {
      console.error('Error adding brand:', error);
      toast({
        title: "Error",
        description: "Failed to create brand profile",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Update brand
  const handleUpdateBrand = async () => {
    if (!editingBrand) return;

    try {
      const { data, error } = await supabase
        .from('brand_profiles')
        .update({
          brand_name: editingBrand.brand_name.trim(),
          primary_color: editingBrand.primary_color,
          secondary_color: editingBrand.secondary_color,
          font_family: editingBrand.font_family,
          contact_email: editingBrand.contact_email?.trim() || null,
          contact_phone: editingBrand.contact_phone?.trim() || null,
          website: editingBrand.website?.trim() || null,
          address: editingBrand.address?.trim() || null,
          logo_url: editingBrand.logo_url?.trim() || null,
        })
        .eq('id', editingBrand.id)
        .select()
        .single();

      if (error) throw error;

      setBrands(brands.map(b => b.id === editingBrand.id ? data : b));
      setEditingBrand(null);
      setIsEditDialogOpen(false);

      toast({
        title: "Success",
        description: "Brand profile updated successfully",
      });
    } catch (error) {
      console.error('Error updating brand:', error);
      toast({
        title: "Error",
        description: "Failed to update brand profile",
        variant: "destructive",
      });
    }
  };

  // Delete brand
  const handleDeleteBrand = async (id: string) => {
    try {
      const { error } = await supabase
        .from('brand_profiles')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setBrands(brands.filter(b => b.id !== id));
      toast({
        title: "Success",
        description: "Brand profile deleted successfully",
      });
    } catch (error) {
      console.error('Error deleting brand:', error);
      toast({
        title: "Error",
        description: "Failed to delete brand profile",
        variant: "destructive",
      });
    }
  };

  // Set default brand
  const handleSetDefault = async (id: string) => {
    try {
      // First, unset all defaults
      await supabase
        .from('brand_profiles')
        .update({ is_default: false })
        .eq('user_id', user?.id);

      // Then set the selected one as default
      const { error } = await supabase
        .from('brand_profiles')
        .update({ is_default: true })
        .eq('id', id);

      if (error) throw error;

      setBrands(brands.map(b => ({ ...b, is_default: b.id === id })));
      toast({
        title: "Success",
        description: "Default brand updated successfully",
      });
    } catch (error) {
      console.error('Error setting default brand:', error);
      toast({
        title: "Error",
        description: "Failed to update default brand",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (user && canUseReviewTemplates) {
      fetchBrands();
    }
  }, [user, canUseReviewTemplates]);

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

  if (!canUseReviewTemplates) {
    return (
      <SidebarProvider>
        <div className="min-h-screen flex w-full">
          <AppSidebar />
          <SidebarInset>
            <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
              <SidebarTrigger className="-ml-1" />
              <div className="flex items-center space-x-4 ml-auto">
                <LocationSelector />
              </div>
            </header>
            <div className="flex-1 space-y-4 p-8 pt-6">
              <UpgradePrompt 
                feature="White-label Reports"
                title="Unlock White-label Reports"
                description="Create custom brand profiles with logos, colors, and styling for professional PDF reports."
                variant="page"
              />
            </div>
          </SidebarInset>
        </div>
      </SidebarProvider>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <SidebarInset>
          <header className="flex h-16 shrink-0 items-center gap-2 border-b px-4">
            <SidebarTrigger className="-ml-1" />
            <div className="flex items-center space-x-4 ml-auto">
              <LocationSelector />
            </div>
          </header>

          <div className="flex-1 space-y-4 p-8 pt-6">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h1 className="text-3xl font-bold mb-2">Brand Management</h1>
                <p className="text-muted-foreground">
                  Create and manage brand profiles for white-label reports
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Brand
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Brand Profile</DialogTitle>
                    <DialogDescription>
                      Set up a brand profile with custom styling for your reports.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="brand_name">Brand Name *</Label>
                        <Input
                          id="brand_name"
                          value={newBrand.brand_name}
                          onChange={(e) => setNewBrand({...newBrand, brand_name: e.target.value})}
                          placeholder="Enter brand name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="logo_upload">Logo Upload</Label>
                        <div className="space-y-2">
                          <Input
                            id="logo_upload"
                            type="file"
                            accept="image/*"
                            onChange={handleLogoSelect}
                            className="cursor-pointer"
                          />
                          {logoPreview && (
                            <div className="relative inline-block">
                              <img 
                                src={logoPreview} 
                                alt="Logo preview" 
                                className="h-16 w-auto object-contain border rounded"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute -top-2 -right-2 h-6 w-6 p-0"
                                onClick={() => {
                                  setLogoFile(null);
                                  setLogoPreview(null);
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="primary_color">Primary Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="primary_color"
                            type="color"
                            value={newBrand.primary_color}
                            onChange={(e) => setNewBrand({...newBrand, primary_color: e.target.value})}
                            className="w-16 h-10"
                          />
                          <Input
                            value={newBrand.primary_color}
                            onChange={(e) => setNewBrand({...newBrand, primary_color: e.target.value})}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="secondary_color">Secondary Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="secondary_color"
                            type="color"
                            value={newBrand.secondary_color}
                            onChange={(e) => setNewBrand({...newBrand, secondary_color: e.target.value})}
                            className="w-16 h-10"
                          />
                          <Input
                            value={newBrand.secondary_color}
                            onChange={(e) => setNewBrand({...newBrand, secondary_color: e.target.value})}
                            placeholder="#666666"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="font_family">Font Family</Label>
                      <Input
                        id="font_family"
                        value={newBrand.font_family}
                        onChange={(e) => setNewBrand({...newBrand, font_family: e.target.value})}
                        placeholder="Arial, sans-serif"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="contact_email">Contact Email</Label>
                        <Input
                          id="contact_email"
                          type="email"
                          value={newBrand.contact_email}
                          onChange={(e) => setNewBrand({...newBrand, contact_email: e.target.value})}
                          placeholder="contact@company.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contact_phone">Contact Phone</Label>
                        <Input
                          id="contact_phone"
                          value={newBrand.contact_phone}
                          onChange={(e) => setNewBrand({...newBrand, contact_phone: e.target.value})}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="website">Website</Label>
                      <Input
                        id="website"
                        value={newBrand.website}
                        onChange={(e) => setNewBrand({...newBrand, website: e.target.value})}
                        placeholder="https://company.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={newBrand.address}
                        onChange={(e) => setNewBrand({...newBrand, address: e.target.value})}
                        placeholder="123 Main St, City, State 12345"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleAddBrand} disabled={isUploading}>
                        {isUploading ? "Creating..." : "Create Brand"}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Brands List */}
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading brand profiles...</p>
              </div>
            ) : brands.length === 0 ? (
              <Card>
                <CardContent className="text-center py-12">
                  <Building2 className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No Brand Profiles</h3>
                  <p className="text-muted-foreground mb-4">
                    Create your first brand profile to start generating white-label reports.
                  </p>
                  <Button onClick={() => setIsAddDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Your First Brand
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {brands.map((brand) => (
                  <Card key={brand.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-2">
                            <CardTitle className="text-lg">{brand.brand_name}</CardTitle>
                            {brand.is_default && (
                              <Badge variant="default">Default</Badge>
                            )}
                          </div>
                          {brand.logo_url && (
                            <div className="mb-2">
                              <img 
                                src={brand.logo_url} 
                                alt={`${brand.brand_name} logo`}
                                className="h-8 w-auto object-contain"
                                onError={(e) => {
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setEditingBrand(brand);
                              setIsEditDialogOpen(true);
                            }}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteBrand(brand.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: brand.primary_color }}
                        />
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: brand.secondary_color }}
                        />
                        <span className="text-sm text-muted-foreground">Colors</span>
                      </div>
                      
                      {brand.contact_email && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Email:</strong> {brand.contact_email}
                        </div>
                      )}
                      
                      {brand.website && (
                        <div className="text-sm text-muted-foreground">
                          <strong>Website:</strong> {brand.website}
                        </div>
                      )}

                      <div className="pt-2">
                        {!brand.is_default && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefault(brand.id)}
                            className="w-full"
                          >
                            Set as Default
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Edit Brand Profile</DialogTitle>
                  <DialogDescription>
                    Update your brand profile settings.
                  </DialogDescription>
                </DialogHeader>
                {editingBrand && (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_brand_name">Brand Name *</Label>
                        <Input
                          id="edit_brand_name"
                          value={editingBrand.brand_name}
                          onChange={(e) => setEditingBrand({...editingBrand, brand_name: e.target.value})}
                          placeholder="Enter brand name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_logo_url">Logo URL</Label>
                        <Input
                          id="edit_logo_url"
                          value={editingBrand.logo_url || ""}
                          onChange={(e) => setEditingBrand({...editingBrand, logo_url: e.target.value})}
                          placeholder="https://example.com/logo.png"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_primary_color">Primary Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="edit_primary_color"
                            type="color"
                            value={editingBrand.primary_color}
                            onChange={(e) => setEditingBrand({...editingBrand, primary_color: e.target.value})}
                            className="w-16 h-10"
                          />
                          <Input
                            value={editingBrand.primary_color}
                            onChange={(e) => setEditingBrand({...editingBrand, primary_color: e.target.value})}
                            placeholder="#000000"
                            className="flex-1"
                          />
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="edit_secondary_color">Secondary Color</Label>
                        <div className="flex items-center space-x-2">
                          <Input
                            id="edit_secondary_color"
                            type="color"
                            value={editingBrand.secondary_color}
                            onChange={(e) => setEditingBrand({...editingBrand, secondary_color: e.target.value})}
                            className="w-16 h-10"
                          />
                          <Input
                            value={editingBrand.secondary_color}
                            onChange={(e) => setEditingBrand({...editingBrand, secondary_color: e.target.value})}
                            placeholder="#666666"
                            className="flex-1"
                          />
                        </div>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="edit_font_family">Font Family</Label>
                      <Input
                        id="edit_font_family"
                        value={editingBrand.font_family}
                        onChange={(e) => setEditingBrand({...editingBrand, font_family: e.target.value})}
                        placeholder="Arial, sans-serif"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="edit_contact_email">Contact Email</Label>
                        <Input
                          id="edit_contact_email"
                          type="email"
                          value={editingBrand.contact_email || ""}
                          onChange={(e) => setEditingBrand({...editingBrand, contact_email: e.target.value})}
                          placeholder="contact@company.com"
                        />
                      </div>
                      <div>
                        <Label htmlFor="edit_contact_phone">Contact Phone</Label>
                        <Input
                          id="edit_contact_phone"
                          value={editingBrand.contact_phone || ""}
                          onChange={(e) => setEditingBrand({...editingBrand, contact_phone: e.target.value})}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="edit_website">Website</Label>
                      <Input
                        id="edit_website"
                        value={editingBrand.website || ""}
                        onChange={(e) => setEditingBrand({...editingBrand, website: e.target.value})}
                        placeholder="https://company.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="edit_address">Address</Label>
                      <Input
                        id="edit_address"
                        value={editingBrand.address || ""}
                        onChange={(e) => setEditingBrand({...editingBrand, address: e.target.value})}
                        placeholder="123 Main St, City, State 12345"
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={handleUpdateBrand}>
                        Update Brand
                      </Button>
                    </div>
                  </div>
                )}
              </DialogContent>
            </Dialog>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
