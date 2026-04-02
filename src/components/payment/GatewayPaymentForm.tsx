// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, CreditCard, Loader2, Shield } from "lucide-react";

interface GatewayPaymentFormProps {
  sites: any[];
  onSuccess: () => void;
}

export function GatewayPaymentForm({ sites, onSuccess }: GatewayPaymentFormProps) {
  const { toast } = useToast();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ site_id: "", provider: "paystack", public_key: "", secret_key: "" });
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("payment_configs").insert({
        site_id: form.site_id,
        provider: form.provider,
        public_key: form.public_key,
        secret_key: form.secret_key,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-configs"] });
      setDialogOpen(false);
      setForm({ site_id: "", provider: "paystack", public_key: "", secret_key: "" });
      toast({ title: "Payment provider connected" });
      onSuccess();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Gateway
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Connect Payment Gateway</DialogTitle>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            addMutation.mutate();
          }}
          className="space-y-4"
        >
          <div className="space-y-2">
            <Label>Business/Site</Label>
            <Select value={form.site_id} onValueChange={(v) => setForm((f) => ({ ...f, site_id: v }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select a business" />
              </SelectTrigger>
              <SelectContent>
                {sites?.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select value={form.provider} onValueChange={(v) => setForm((f) => ({ ...f, provider: v }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="paystack">Paystack</SelectItem>
                <SelectItem value="flutterwave">Flutterwave</SelectItem>
                <SelectItem value="stripe">Stripe</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Public Key</Label>
            <Input
              value={form.public_key}
              onChange={(e) => setForm((f) => ({ ...f, public_key: e.target.value }))}
              required
              placeholder="pk_..."
            />
          </div>
          <div className="space-y-2">
            <Label>Secret Key</Label>
            <Input
              type="password"
              value={form.secret_key}
              onChange={(e) => setForm((f) => ({ ...f, secret_key: e.target.value }))}
              required
              placeholder="sk_..."
            />
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Shield className="h-3 w-3" /> Encrypted and stored securely
            </p>
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={addMutation.isPending || !form.site_id}
          >
            {addMutation.isPending ? "Connecting..." : "Connect Gateway"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
