/* eslint-disable */
// @ts-nocheck
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CreditCard, Loader2, Trash2, Building2, Clock } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { GatewayPaymentForm } from "@/components/payment/GatewayPaymentForm";
import { ManualPaymentForm } from "@/components/payment/ManualPaymentForm";
import { PaymentConfirmationCard } from "@/components/payment/PaymentConfirmationCard";

const providerInfo: Record<string, { label: string; color: string }> = {
  paystack: { label: "Paystack", color: "bg-info/10 text-info border-info/20" },
  flutterwave: { label: "Flutterwave", color: "bg-warning/10 text-warning border-warning/20" },
  stripe: { label: "Stripe", color: "bg-primary/10 text-primary border-primary/20" },
};

const Payments = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("gateway");

  // Fetch sites
  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  // Fetch gateway payment configs
  const { data: configs, isLoading: configsLoading } = useQuery({
    queryKey: ["payment-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_configs")
        .select("*, sites(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch manual payment configs
  const { data: manualConfigs, isLoading: manualLoading } = useQuery({
    queryKey: ["manual-payment-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("manual_payment_config")
        .select("*, sites(name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Fetch pending payment confirmations
  const { data: paymentConfirmations, isLoading: confirmationsLoading } = useQuery({
    queryKey: ["payment-confirmations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("payment_confirmations")
        .select("*, sites(name), orders(customer_name, customer_email, total_amount, payment_status)")
        .eq("status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  // Toggle gateway mutation
  const toggleGatewayMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase.from("payment_configs").update({ is_active } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["payment-configs"] }),
  });

  // Delete gateway mutation
  const deleteGatewayMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("payment_configs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-configs"] });
      toast({ title: "Provider removed" });
    },
  });

  // Delete manual config mutation
  const deleteManualMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("manual_payment_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["manual-payment-configs"] });
      toast({ title: "Manual payment config removed" });
    },
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["payment-confirmations"] });
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Payment Settings</h1>
        <p className="text-muted-foreground mt-1">
          Manage payment gateways and manual payment configurations
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="gateway">Payment Gateways</TabsTrigger>
          <TabsTrigger value="manual">Manual Payment</TabsTrigger>
          <TabsTrigger value="confirmations">
            Confirmations
            {paymentConfirmations?.length ? (
              <Badge variant="destructive" className="ml-2">
                {paymentConfirmations.length}
              </Badge>
            ) : null}
          </TabsTrigger>
        </TabsList>

        {/* Gateway Tab */}
        <TabsContent value="gateway" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Payment Gateways</h2>
              <p className="text-sm text-muted-foreground">
                Connect Paystack, Flutterwave, or Stripe for automatic payments
              </p>
            </div>
            <GatewayPaymentForm sites={sites || []} onSuccess={() => {}} />
          </div>

          {configsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !configs?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-medium mb-1">No gateways connected</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Connect a payment gateway to enable in-checkout payments
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {configs.map((config: any) => (
                <div
                  key={config.id}
                  className="border rounded-lg p-4 flex items-center justify-between hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                      <CreditCard className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium">{providerInfo[config.provider]?.label || config.provider}</p>
                        <Badge
                          variant="outline"
                          className={`text-xs ${providerInfo[config.provider]?.color || ""}`}
                        >
                          {config.provider}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {(config as any).sites?.name} · {config.public_key.slice(0, 12)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Switch
                      checked={config.is_active}
                      onCheckedChange={(checked) =>
                        toggleGatewayMutation.mutate({ id: config.id, is_active: checked })
                      }
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-destructive"
                      onClick={() => deleteGatewayMutation.mutate(config.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Manual Payment Tab */}
        <TabsContent value="manual" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Manual Payment Configuration</h2>
              <p className="text-sm text-muted-foreground">
                Add bank details for businesses without payment gateways
              </p>
            </div>
            <ManualPaymentForm sites={sites || []} onSuccess={() => {}} />
          </div>

          {manualLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !manualConfigs?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-medium mb-1">No manual payment configs</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Add bank details to allow customers to pay via bank transfer
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {manualConfigs.map((config: any) => (
                <Card key={config.id}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-base">{(config as any).sites?.name}</CardTitle>
                        <CardDescription>{config.bank_name}</CardDescription>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-destructive"
                        onClick={() => deleteManualMutation.mutate(config.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Name:</span>
                      <span className="font-mono">{config.account_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Account Number:</span>
                      <span className="font-mono font-semibold">{config.account_number}</span>
                    </div>
                    {config.instructions && (
                      <div className="pt-2 mt-2 border-t">
                        <p className="text-muted-foreground">{config.instructions}</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Confirmations Tab */}
        <TabsContent value="confirmations" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-lg font-semibold">Pending Payment Confirmations</h2>
              <p className="text-sm text-muted-foreground">
                Review and confirm manual payment proofs from customers
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={handleRefresh}>
              Refresh
            </Button>
          </div>

          {confirmationsLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : !paymentConfirmations?.length ? (
            <Card>
              <CardContent className="py-12 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                <h3 className="font-medium mb-1">No pending confirmations</h3>
                <p className="text-sm text-muted-foreground">
                  All payment proofs have been reviewed
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paymentConfirmations.map((confirmation: any) => (
                <PaymentConfirmationCard
                  key={confirmation.id}
                  confirmation={confirmation}
                  onSuccess={handleRefresh}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Payments;
