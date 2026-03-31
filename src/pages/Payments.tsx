import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Plus, CreditCard, Loader2, Trash2, Shield } from "lucide-react";

const providerInfo: Record<string, { label: string; color: string }> = {
  paystack: { label: "Paystack", color: "bg-info/10 text-info border-info/20" },
  flutterwave: { label: "Flutterwave", color: "bg-warning/10 text-warning border-warning/20" },
  stripe: { label: "Stripe", color: "bg-primary/10 text-primary border-primary/20" },
};

const Payments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ site_id: "", provider: "paystack", public_key: "", secret_key: "" });

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: configs, isLoading } = useQuery({
    queryKey: ["payment-configs"],
    queryFn: async () => {
      const { data, error } = await supabase.from("payment_configs").select("*, sites(name)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payment_configs").insert({
        site_id: form.site_id, provider: form.provider, public_key: form.public_key, secret_key: form.secret_key,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-configs"] });
      setDialogOpen(false);
      setForm({ site_id: "", provider: "paystack", public_key: "", secret_key: "" });
      toast({ title: "Payment provider connected" });
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("payment_configs").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-configs"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["payment-configs"] }); toast({ title: "Provider removed" }); },
  });

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Payments</h1>
          <p className="text-sm text-muted-foreground mt-1">Connect payment providers for in-chat checkout</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Add provider</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Connect payment provider</DialogTitle></DialogHeader>
            <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
              <div className="space-y-2">
                <Label>Sales Rep</Label>
                <Select value={form.site_id} onValueChange={(v) => setForm((f) => ({ ...f, site_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select Sales Rep" /></SelectTrigger>
                  <SelectContent>
                    {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Provider</Label>
                <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paystack">Paystack</SelectItem>
                    <SelectItem value="flutterwave">Flutterwave</SelectItem>
                    <SelectItem value="stripe">Stripe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Public Key</Label>
                <Input value={form.public_key} onChange={(e) => setForm((f) => ({ ...f, public_key: e.target.value }))} required placeholder="pk_..." />
              </div>
              <div className="space-y-2">
                <Label>Secret Key</Label>
                <Input type="password" value={form.secret_key} onChange={(e) => setForm((f) => ({ ...f, secret_key: e.target.value }))} required placeholder="sk_..." />
                <p className="text-xs text-muted-foreground flex items-center gap-1"><Shield className="h-3 w-3" /> Encrypted and stored securely</p>
              </div>
              <Button type="submit" className="w-full" disabled={addMutation.isPending || !form.site_id}>
                {addMutation.isPending ? "Connecting..." : "Connect provider"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !configs?.length ? (
        <div className="border border-dashed rounded-lg flex flex-col items-center justify-center py-16 sm:py-20 px-4">
          <CreditCard className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No payment providers</h3>
          <p className="text-muted-foreground text-sm mb-4 text-center">Connect Paystack, Flutterwave, or Stripe</p>
        </div>
      ) : (
        <div className="space-y-3">
          {configs.map((config: any) => (
            <div key={config.id} className="border rounded-lg p-3 sm:p-4 flex items-center justify-between hover:bg-muted/30 transition-colors gap-3">
              <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                  <CreditCard className="h-5 w-5 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-medium text-sm">{providerInfo[config.provider]?.label || config.provider}</p>
                    <Badge variant="outline" className={`text-[10px] ${providerInfo[config.provider]?.color || ""}`}>{config.provider}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{(config as any).sites?.name} · {config.public_key.slice(0, 12)}...</p>
                </div>
              </div>
              <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                <Switch checked={config.is_active} onCheckedChange={(checked) => toggleMutation.mutate({ id: config.id, is_active: checked })} />
                <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" onClick={() => deleteMutation.mutate(config.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Payments;
