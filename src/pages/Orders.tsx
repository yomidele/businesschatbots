/* eslint-disable */
// @ts-nocheck
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
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
      let query = supabase.from("orders").select("*, sites(name, currency), products(name, image_url)").order("created_at", { ascending: false });
      if (selectedSiteId !== "all") query = query.eq("site_id", selectedSiteId);
      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = orders?.filter((o: any) => o.payment_status === "paid").reduce((sum: number, o: any) => sum + Number(o.total_amount), 0) || 0;
  const pendingCount = orders?.filter((o: any) => o.payment_status === "pending").length || 0;

  const formatAmount = (order: any) => {
    const currency = (order as any).sites?.currency || "USD";
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
          <SelectTrigger className="w-[160px] h-9 text-xs"><SelectValue placeholder="Filter" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sales Reps</SelectItem>
            {sites?.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

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
          <table className="w-full text-sm min-w-[450px]">
            <thead>
              <tr className="border-b bg-muted/50">
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Customer</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden sm:table-cell">Amount</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3">Status</th>
                <th className="text-left font-medium text-muted-foreground px-4 py-3 hidden md:table-cell">Date</th>
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
                  <td className="px-4 py-3 hidden md:table-cell text-muted-foreground text-xs">
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
