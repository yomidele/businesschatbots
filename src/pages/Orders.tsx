/* eslint-disable */
// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, ShoppingCart, Clock, Eye, CheckCircle, XCircle, Truck, Package, Mail, Phone, MapPin, Receipt } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  paid: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
  cancelled: "bg-muted text-muted-foreground border-muted",
};

const deliveryColors: Record<string, string> = {
  processing: "bg-warning/10 text-warning border-warning/20",
  shipped: "bg-info/10 text-info border-info/20",
  delivered: "bg-success/10 text-success border-success/20",
};

const Orders = () => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*").order("name");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders, isLoading } = useQuery({
    queryKey: ["orders", selectedSiteId],
    queryFn: async () => {
      let query = supabase
        .from("orders")
        .select("*, sites(name, currency)")
        .order("created_at", { ascending: false });
      if (selectedSiteId !== "all") query = query.eq("site_id", selectedSiteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const updatePaymentMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ payment_status: status })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Payment ${vars.status === "paid" ? "approved" : "rejected"}`);
      if (selectedOrder?.id === vars.orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, payment_status: vars.status } : null);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateDeliveryMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: string; status: string }) => {
      const { error } = await supabase
        .from("orders")
        .update({ delivery_status: status })
        .eq("id", orderId);
      if (error) throw error;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      toast.success(`Delivery status updated to ${vars.status}`);
      if (selectedOrder?.id === vars.orderId) {
        setSelectedOrder((prev: any) => prev ? { ...prev, delivery_status: vars.status } : null);
      }
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalRevenue = orders?.filter((o: any) => o.payment_status === "paid").reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) || 0;
  const pendingCount = orders?.filter((o: any) => o.payment_status === "pending").length || 0;

  const formatAmount = (order: any) => {
    const currency = order.sites?.currency || "USD";
    const symbols: Record<string, string> = { USD: "$", EUR: "€", GBP: "£", NGN: "₦", KES: "KSh", GHS: "₵", ZAR: "R", INR: "₹", CAD: "C$", AUD: "A$", BRL: "R$" };
    return `${symbols[currency] || currency + " "}${Number(order.total_amount).toFixed(2)}`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 sm:mb-8">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Track customer orders and payments</p>
        </div>
        <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
          <SelectTrigger className="w-[180px] h-9 text-xs"><SelectValue placeholder="Filter by site" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sales Reps</SelectItem>
            {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-3 sm:gap-4 mb-6 sm:mb-8">
        <div className="border rounded-lg p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Total Orders</p>
          <p className="text-lg sm:text-2xl font-semibold">{orders?.length || 0}</p>
        </div>
        <div className="border rounded-lg p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Revenue</p>
          <p className="text-lg sm:text-2xl font-semibold text-success">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="border rounded-lg p-3 sm:p-4">
          <p className="text-[10px] sm:text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-lg sm:text-2xl font-semibold text-warning">{pendingCount}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !orders?.length ? (
        <div className="border border-dashed rounded-lg flex flex-col items-center justify-center py-16 sm:py-20 px-4">
          <ShoppingCart className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No orders yet</h3>
          <p className="text-muted-foreground text-sm text-center">Orders appear when customers purchase through your Sales Rep</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-x-auto">
          <table className="w-full text-sm min-w-[550px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Customer</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Amount</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Payment</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Delivery</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Date</th>
                <th className="text-right font-medium text-muted-foreground px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-sm truncate max-w-[150px]">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground truncate max-w-[150px]">{order.customer_email || order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-medium">{formatAmount(order)}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[order.payment_status] || ""}>{order.payment_status}</Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <Badge variant="outline" className={deliveryColors[order.delivery_status] || "bg-muted text-muted-foreground"}>
                      {order.delivery_status || "processing"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button size="icon" variant="ghost" className="h-8 w-8" onClick={() => setSelectedOrder(order)} title="View details">
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Order Details Dialog */}
      <Dialog open={!!selectedOrder} onOpenChange={(open) => !open && setSelectedOrder(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              Order Details
            </DialogTitle>
          </DialogHeader>
          {selectedOrder && (
            <div className="space-y-5">
              {/* Order ID */}
              <div className="bg-muted/50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Order ID</p>
                <p className="text-sm font-mono mt-0.5">{selectedOrder.id.slice(0, 8)}...</p>
              </div>

              {/* Customer Info */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Customer</h4>
                <div className="grid gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{selectedOrder.customer_name}</span>
                  </div>
                  {selectedOrder.customer_email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3.5 w-3.5" /> {selectedOrder.customer_email}
                    </div>
                  )}
                  {selectedOrder.customer_phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3.5 w-3.5" /> {selectedOrder.customer_phone}
                    </div>
                  )}
                  {selectedOrder.customer_address && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" /> {selectedOrder.customer_address}
                    </div>
                  )}
                </div>
              </div>

              {/* Product Summary */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Products</h4>
                <div className="bg-muted/30 rounded-lg p-3 text-sm">
                  {selectedOrder.description || selectedOrder.items ? (
                    <p>{selectedOrder.description || JSON.stringify(selectedOrder.items)}</p>
                  ) : (
                    <p className="text-muted-foreground">No product details available</p>
                  )}
                </div>
                <div className="flex justify-between items-center pt-1">
                  <span className="text-sm font-medium">Total</span>
                  <span className="text-sm font-bold">{formatAmount(selectedOrder)}</span>
                </div>
              </div>

              {/* Receipt */}
              {selectedOrder.receipt_url && (
                <div className="space-y-2">
                  <h4 className="text-sm font-semibold flex items-center gap-2"><Receipt className="h-4 w-4" /> Receipt</h4>
                  <a href={selectedOrder.receipt_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary underline">View uploaded receipt</a>
                </div>
              )}

              {/* Payment Status Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Payment Status</h4>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className={statusColors[selectedOrder.payment_status] || ""}>
                    {selectedOrder.payment_status}
                  </Badge>
                  {selectedOrder.payment_status === "pending" && (
                    <div className="flex gap-1 ml-auto">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-success border-success/30 hover:bg-success/10"
                        onClick={() => updatePaymentMutation.mutate({ orderId: selectedOrder.id, status: "paid" })}
                        disabled={updatePaymentMutation.isPending}
                      >
                        <CheckCircle className="h-3.5 w-3.5 mr-1" /> Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive border-destructive/30 hover:bg-destructive/10"
                        onClick={() => updatePaymentMutation.mutate({ orderId: selectedOrder.id, status: "failed" })}
                        disabled={updatePaymentMutation.isPending}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" /> Reject
                      </Button>
                    </div>
                  )}
                </div>
              </div>

              {/* Delivery Status Actions */}
              <div className="space-y-2">
                <h4 className="text-sm font-semibold">Delivery Status</h4>
                <div className="flex items-center gap-2 flex-wrap">
                  {["processing", "shipped", "delivered"].map((status) => (
                    <Button
                      key={status}
                      size="sm"
                      variant={selectedOrder.delivery_status === status ? "default" : "outline"}
                      className="capitalize text-xs"
                      onClick={() => updateDeliveryMutation.mutate({ orderId: selectedOrder.id, status })}
                      disabled={updateDeliveryMutation.isPending || selectedOrder.delivery_status === status}
                    >
                      {status === "processing" && <Package className="h-3 w-3 mr-1" />}
                      {status === "shipped" && <Truck className="h-3 w-3 mr-1" />}
                      {status === "delivered" && <CheckCircle className="h-3 w-3 mr-1" />}
                      {status}
                    </Button>
                  ))}
                </div>
              </div>

              {/* Date */}
              <div className="text-xs text-muted-foreground flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(selectedOrder.created_at).toLocaleString()}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Orders;
