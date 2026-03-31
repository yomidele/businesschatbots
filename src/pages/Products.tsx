import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Package, Loader2, Trash2, Pencil, Image as ImageIcon } from "lucide-react";

const Products = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<any>(null);
  const [form, setForm] = useState({ name: "", description: "", price: "", image_url: "", category: "general", stock: "" });

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

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        site_id: selectedSiteId === "all" ? sites?.[0]?.id : selectedSiteId,
        name: form.name,
        description: form.description || null,
        price: form.price ? parseFloat(form.price) : null,
        image_url: form.image_url || null,
        category: form.category,
        stock: form.stock ? parseInt(form.stock) : null,
      };
      if (editProduct) {
        const { error } = await supabase.from("products").update(payload).eq("id", editProduct.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("products").insert(payload as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["products"] });
      setDialogOpen(false); setEditProduct(null);
      setForm({ name: "", description: "", price: "", image_url: "", category: "general", stock: "" });
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

  const openEdit = (product: any) => {
    setEditProduct(product);
    setForm({ name: product.name, description: product.description || "", price: product.price?.toString() || "", image_url: product.image_url || "", category: product.category || "general", stock: product.stock?.toString() || "" });
    setDialogOpen(true);
  };

  const openNew = () => {
    setEditProduct(null);
    setForm({ name: "", description: "", price: "", image_url: "", category: "general", stock: "" });
    setDialogOpen(true);
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
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" onClick={openNew}><Plus className="h-4 w-4 mr-2" /> Add product</Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>{editProduct ? "Edit product" : "Add product"}</DialogTitle></DialogHeader>
              <form onSubmit={(e) => { e.preventDefault(); saveMutation.mutate(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
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
                <div className="space-y-2">
                  <Label>Image URL</Label>
                  <Input value={form.image_url} onChange={(e) => setForm((f) => ({ ...f, image_url: e.target.value }))} placeholder="https://..." />
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))} />
                </div>
                <Button type="submit" className="w-full" disabled={saveMutation.isPending}>
                  {saveMutation.isPending ? "Saving..." : editProduct ? "Update" : "Add product"}
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
          <p className="text-muted-foreground text-sm mb-4 text-center">Train your Sales Rep or add products manually</p>
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
