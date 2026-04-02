// @ts-nocheck
import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Package, Loader2, Trash2, Pencil, Image as ImageIcon, Upload, X, AlertCircle } from "lucide-react";

const Products = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", image_url: "", category: "general", stock: "" });

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ["products", selectedSiteId],
    queryFn: async () => {
      let query = supabase.from("products").select("*, sites(name, currency)").order("created_at", { ascending: false });
      if (selectedSiteId !== "all") query = query.eq("site_id", selectedSiteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const uploadImage = async (file: File, siteId: string): Promise<string> => {
    const timestamp = Date.now();
    const ext = file.name.split(".").pop();
    const fileName = `${siteId}/${timestamp}_${Math.random().toString(36).substr(2, 9)}.${ext}`;

    const { error: uploadError } = await supabase.storage
      .from("product-images")
      .upload(fileName, file, { contentType: file.type, cacheControl: "3600" });

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);

    const { data: urlData } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);

    return urlData.publicUrl;
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      // When editing, always use the product's original site_id
      const siteId = editProduct
        ? editProduct.site_id
        : selectedSiteId === "all"
          ? sites?.[0]?.id
          : selectedSiteId;
      if (!siteId) throw new Error("Please select a Sales Rep first");

      let finalImageUrl = form.image_url;

      // Upload image file if selected
      if (imageFile) {
        setUploading(true);
        try {
          finalImageUrl = await uploadImage(imageFile, siteId);
        } catch (uploadErr: any) {
          setUploading(false);
          throw new Error(`Image upload failed: ${uploadErr.message}`);
        }
        setUploading(false);
      }

      if (!form.name.trim()) throw new Error("Product name is required");

      const payload: Record<string, any> = {
        name: form.name,
        description: form.description || null,
        price: form.price ? parseFloat(form.price) : null,
        image_url: finalImageUrl || null,
        category: form.category,
        stock: form.stock ? parseInt(form.stock) : null,
      };

      if (editProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editProduct.id);
        if (error) throw new Error(`Update failed: ${error.message}`);
      } else {
        payload.site_id = siteId;
        const { error } = await supabase.from("products").insert(payload as any);
        if (error) throw new Error(`Insert failed: ${error.message}`);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false);
      resetForm();
      toast({ title: editProduct ? "Product updated" : "Product added" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["products"] }); toast({ title: "Product deleted" }); },
  });

  const resetForm = () => {
    setEditProduct(null);
    setForm({ name: "", description: "", price: "", image_url: "", category: "general", stock: "" });
    setImageFile(null);
    setImagePreview(null);
  };

  const openEdit = (product: any) => {
    setEditProduct(product);
    setForm({ name: product.name, description: product.description || "", price: product.price?.toString() || "", image_url: product.image_url || "", category: product.category || "general", stock: product.stock?.toString() || "" });
    setImageFile(null);
    setImagePreview(product.image_url || null);
    setDialogOpen(true);
  };

  const openNew = () => {
    resetForm();
    setDialogOpen(true);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({ title: "Invalid file", description: "Please select an image file (JPG, PNG, etc.)", variant: "destructive" });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "File too large", description: "Images must be under 5MB", variant: "destructive" });
      return;
    }
    setImageFile(file);
    const reader = new FileReader();
    reader.onloadend = () => setImagePreview(reader.result as string);
    reader.readAsDataURL(file);
    // Clear the URL input since we're using file upload
    setForm(f => ({ ...f, image_url: "" }));
  };

  const getCurrencySymbol = (product: any) => {
    const currency = (product as any).sites?.currency || "USD";
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh", GHS: "₵", ZAR: "R", INR: "₹", CAD: "C$", AUD: "A$", BRL: "R$" };
    return symbols[currency] || currency + " ";
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage your product catalog</p>
        </div>
        <div className="flex gap-3 flex-wrap">
          <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
            <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Filter by site" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sales Reps</SelectItem>
              {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add product</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editProduct ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                {!editProduct && selectedSiteId === "all" && (!sites || sites.length === 0) && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>Create a Sales Rep first before adding products.</AlertDescription>
                  </Alert>
                )}
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Price</Label>
                    <Input type="number" step="0.01" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} />
                  </div>
                  <div className="space-y-2">
                    <Label>Stock</Label>
                    <Input type="number" value={form.stock} onChange={(e) => setForm((f) => ({ ...f, stock: e.target.value }))} />
                  </div>
                </div>

                {/* Image Upload Section */}
                <div className="space-y-2">
                  <Label>Product Image</Label>
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files?.[0];
                      if (file) {
                        const dt = new DataTransfer();
                        dt.items.add(file);
                        if (fileInputRef.current) {
                          fileInputRef.current.files = dt.files;
                          handleFileSelect({ target: fileInputRef.current } as any);
                        }
                      }
                    }}
                    className="border-2 border-dashed rounded-lg p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
                  >
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {imagePreview ? (
                      <div className="space-y-2">
                        <img src={imagePreview} alt="Preview" className="w-24 h-24 mx-auto object-cover rounded-lg" />
                        {uploading && (
                          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                          </div>
                        )}
                        {imageFile && !uploading && (
                          <p className="text-xs text-muted-foreground">{imageFile.name}</p>
                        )}
                        {!imageFile && form.image_url && (
                          <p className="text-xs text-green-600">Current image</p>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <Upload className="h-8 w-8 mx-auto text-muted-foreground" />
                        <p className="text-sm font-medium">Click or drag to upload</p>
                        <p className="text-xs text-muted-foreground">PNG, JPG up to 5MB</p>
                      </div>
                    )}
                  </div>
                  {imagePreview && (
                    <Button type="button" variant="ghost" size="sm" onClick={() => {
                      setImageFile(null);
                      setImagePreview(null);
                      setForm(f => ({ ...f, image_url: "" }));
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}>
                      <X className="h-3 w-3 mr-1" /> Remove
                    </Button>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending || uploading}>
                  {saveMutation.isPending || uploading ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Saving...</>
                  ) : editProduct ? "Update" : "Add product"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !products?.length ? (
        <div className="border border-dashed rounded-lg flex flex-col items-center justify-center py-16 sm:py-20 px-4">
          <Package className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No products yet</h3>
          <p className="text-muted-foreground text-sm mb-4 text-center">Add products manually or crawl your website</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
          {products.map((p: any) => (
            <Card key={p.id} className="overflow-hidden group">
              <div className="aspect-square bg-muted relative flex items-center justify-center">
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                ) : (
                  <ImageIcon className="h-8 w-8 sm:h-10 sm:w-10 text-muted-foreground/30" />
                )}
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button size="icon" variant="secondary" className="h-7 w-7" onClick={() => openEdit(p)}>
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="secondary" className="h-7 w-7 text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              <CardContent className="p-2.5 sm:p-3">
                <div className="flex items-start justify-between gap-1">
                  <div className="min-w-0">
                    <p className="font-medium text-xs sm:text-sm truncate">{p.name}</p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground truncate">{(p as any).sites?.name}</p>
                  </div>
                  {p.price && (
                    <Badge variant="secondary" className="text-[10px] sm:text-xs shrink-0">
                      {getCurrencySymbol(p)}{Number(p.price).toFixed(2)}
                    </Badge>
                  )}
                </div>
                {p.description && <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 line-clamp-2">{p.description}</p>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Products;
