import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";

interface ManualPaymentFormProps {
  sites: any[];
  onSuccess: () => void;
}

export function ManualPaymentForm({ sites, onSuccess }: ManualPaymentFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({
    site_id: "",
    bank_name: "",
    account_name: "",
    account_number: "",
    instructions: "",
  });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("manual_payment_config").upsert({
        site_id: form.site_id,
        bank_name: form.bank_name,
        account_name: form.account_name,
        account_number: form.account_number,
        instructions: form.instructions,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-payment-configs"] });
      setDialogOpen(false);
      setForm({
        site_id: "",
        bank_name: "",
        account_name: "",
        account_number: "",
        instructions: "",
      });
      toast({ title: "Manual payment config saved" });
      onSuccess();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  return (
    <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Bank Details
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Manual Payment Configuration</DialogTitle>
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
            <Label>Bank Name</Label>
            <Input
              value={form.bank_name}
              onChange={(e) => setForm((f) => ({ ...f, bank_name: e.target.value }))}
              required
              placeholder="e.g., First Bank"
            />
          </div>
          <div className="space-y-2">
            <Label>Account Name</Label>
            <Input
              value={form.account_name}
              onChange={(e) => setForm((f) => ({ ...f, account_name: e.target.value }))}
              required
              placeholder="Account holder name"
            />
          </div>
          <div className="space-y-2">
            <Label>Account Number</Label>
            <Input
              value={form.account_number}
              onChange={(e) => setForm((f) => ({ ...f, account_number: e.target.value }))}
              required
              placeholder="10-digit account number"
            />
          </div>
          <div className="space-y-2">
            <Label>Payment Instructions (Optional)</Label>
            <Textarea
              value={form.instructions}
              onChange={(e) => setForm((f) => ({ ...f, instructions: e.target.value }))}
              placeholder="e.g., Please include your order number in the transfer memo..."
              rows={3}
            />
          </div>
          <Button
            type="submit"
            className="w-full"
            disabled={addMutation.isPending || !form.site_id}
          >
            {addMutation.isPending ? "Saving..." : "Save Configuration"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
