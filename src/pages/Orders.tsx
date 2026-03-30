import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Loader2, ShoppingCart, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const statusColors: Record<string, string> = {
  pending: "bg-warning/10 text-warning border-warning/20",
  paid: "bg-success/10 text-success border-success/20",
  failed: "bg-destructive/10 text-destructive border-destructive/20",
};

const Orders = () => {
  const [selectedSiteId, setSelectedSiteId] = useState<string>("all");

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
      let query = supabase.from("orders").select("*, sites(name), products(name, image_url)").order("created_at", { ascending: false });
      if (selectedSiteId !== "all") query = query.eq("site_id", selectedSiteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = orders?.filter((o: any) => o.payment_status === "paid").reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) || 0;
  const pendingCount = orders?.filter((o: any) => o.payment_status === "pending").length || 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
          <p className="text-sm text-muted-foreground mt-1">Track customer orders and payments</p>
        </div>
        <Select value={selectedSiteId} onValueChange={setSelectedSiteId}>
          <SelectTrigger className="w-[180px] h-9 text-xs">
            <SelectValue placeholder="Filter by site" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All sites</SelectItem>
            {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Total Orders</p>
          <p className="text-2xl font-semibold">{orders?.length || 0}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Revenue</p>
          <p className="text-2xl font-semibold text-success">${totalRevenue.toFixed(2)}</p>
        </div>
        <div className="border rounded-lg p-4">
          <p className="text-xs text-muted-foreground mb-1">Pending</p>
          <p className="text-2xl font-semibold text-warning">{pendingCount}</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : !orders?.length ? (
        <div className="border border-dashed rounded-lg flex flex-col items-center justify-center py-20">
          <ShoppingCart className="h-10 w-10 text-muted-foreground mb-4" />
          <h3 className="font-medium mb-1">No orders yet</h3>
          <p className="text-muted-foreground text-sm">Orders will appear when customers purchase through the chat widget</p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Customer</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Product</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Amount</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden lg:table-cell">Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order: any) => (
                <tr key={order.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">{order.customer_email || order.customer_phone}</p>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <p className="text-sm">{(order as any).products?.name || "—"}</p>
                    <p className="text-xs text-muted-foreground">Qty: {order.quantity}</p>
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell font-medium">
                    ${Number(order.total_amount).toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={statusColors[order.payment_status] || ""}>
                      {order.payment_status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 hidden lg:table-cell text-muted-foreground text-xs">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default Orders;
