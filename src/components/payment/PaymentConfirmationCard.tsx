// @ts-nocheck
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, XCircle, Clock } from "lucide-react";

interface PaymentConfirmationCardProps {
  confirmation: any;
  onSuccess: () => void;
}

export function PaymentConfirmationCard({ confirmation, onSuccess }: PaymentConfirmationCardProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showRejectReason, setShowRejectReason] = useState(false);
  const [rejectReason, setRejectReason] = useState("");

  const order = confirmation.orders;
  const site = confirmation.sites;

  const confirmPaymentMutation = useMutation({
    mutationFn: async () => {
      const { error: updateError } = await supabase
        .from("payment_confirmations")
        .update({ status: "confirmed", reviewed_at: new Date().toISOString() })
        .eq("id", confirmation.id);

      if (updateError) throw updateError;

      const { error: orderError } = await supabase
        .from("orders")
        .update({ payment_status: "paid" })
        .eq("id", confirmation.order_id);

      if (orderError) throw orderError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-confirmations"] });
      toast({ title: "Payment confirmed" });
      onSuccess();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const rejectPaymentMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("payment_confirmations")
        .update({
          status: "rejected",
          rejection_reason: rejectReason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", confirmation.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["payment-confirmations"] });
      toast({ title: "Payment rejected" });
      setShowRejectReason(false);
      setRejectReason("");
      onSuccess();
    },
    onError: (err) => toast({ title: "Error", description: err.message, variant: "destructive" }),
  });

  const isProcessing = confirmPaymentMutation.isPending || rejectPaymentMutation.isPending;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base">{order?.customer_name}</CardTitle>
            <p className="text-sm text-muted-foreground">{site?.name}</p>
          </div>
          <Badge variant="secondary">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 p-3 rounded space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Email:</span>
            <span>{order?.customer_email}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Amount:</span>
            <span className="font-semibold">{order?.total_amount}</span>
          </div>
        </div>

        {confirmation.proof_url && (
          <div>
            <p className="text-sm font-medium mb-2">Payment Proof:</p>
            <a
              href={confirmation.proof_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline text-sm"
            >
              View proof document
            </a>
          </div>
        )}

        {confirmation.proof_notes && (
          <div className="bg-blue-50 p-3 rounded text-sm">
            <p className="font-medium mb-1">Customer notes:</p>
            <p>{confirmation.proof_notes}</p>
          </div>
        )}

        {!showRejectReason ? (
          <div className="flex gap-2">
            <Button className="flex-1" onClick={() => confirmPaymentMutation.mutate()} disabled={isProcessing}>
              <CheckCircle className="h-4 w-4 mr-2" />
              Confirm Payment
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowRejectReason(true)}
              disabled={isProcessing}
            >
              <XCircle className="h-4 w-4 mr-2" />
              Reject
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
            <Textarea
              placeholder="Why are you rejecting this payment?"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={2}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowRejectReason(false)}
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={() => {
                  rejectPaymentMutation.mutate();
                }}
                disabled={isProcessing || !rejectReason}
              >
                Confirm Rejection
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
