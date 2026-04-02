/* eslint-disable */
// @ts-nocheck
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase-external";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Globe, Package, ShoppingCart, MessageSquare, DollarSign, TrendingUp } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

const Overview = () => {
  const { data: sites } = useQuery({
    queryKey: ["sites"],
    queryFn: async () => {
      const { data, error } = await supabase.from("sites").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: products } = useQuery({
    queryKey: ["products-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("products").select("id");
      if (error) throw error;
      return data;
    },
  });

  const { data: orders } = useQuery({
    queryKey: ["orders-all"],
    queryFn: async () => {
      const { data, error } = await supabase.from("orders").select("*");
      if (error) throw error;
      return data;
    },
  });

  const { data: conversations } = useQuery({
    queryKey: ["conversations-count"],
    queryFn: async () => {
      const { data, error } = await supabase.from("conversations").select("id, created_at").order("created_at", { ascending: false }).limit(50);
      if (error) throw error;
      return data;
    },
  });

  const totalRevenue = orders?.filter((o) => o.payment_status === "paid").reduce((sum, o) => sum + Number(o.total_amount), 0) || 0;
  const pendingOrders = orders?.filter((o) => o.payment_status === "pending").length || 0;
  const readySites = sites?.filter((s) => s.status === "ready").length || 0;

  const stats = [
    { label: "Sales Reps", value: sites?.length || 0, sub: `${readySites} active`, icon: Globe, color: "text-primary" },
    { label: "Products", value: products?.length || 0, sub: "catalogued", icon: Package, color: "text-info" },
    { label: "Orders", value: orders?.length || 0, sub: `${pendingOrders} pending`, icon: ShoppingCart, color: "text-warning" },
    { label: "Revenue", value: `$${totalRevenue.toFixed(2)}`, sub: "total earned", icon: DollarSign, color: "text-success" },
    { label: "Conversations", value: conversations?.length || 0, sub: "chat sessions", icon: MessageSquare, color: "text-accent-foreground" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Your AI Sales Rep dashboard at a glance</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4 mb-6 sm:mb-8">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-3 sm:p-4">
              <div className="flex items-center justify-between mb-2 sm:mb-3">
                <p className="text-[10px] sm:text-xs text-muted-foreground font-medium">{stat.label}</p>
                <stat.icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${stat.color}`} />
              </div>
              <p className="text-lg sm:text-2xl font-semibold">{stat.value}</p>
              <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm sm:text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4" />
            Recent Orders
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!orders?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No orders yet. Orders appear when customers purchase through your Sales Rep.</p>
          ) : (
            <div className="space-y-3">
              {orders.slice(0, 5).map((order) => (
                <div key={order.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{order.customer_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(order.created_at), { addSuffix: true })}
                    </p>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <p className="text-sm font-medium">${Number(order.total_amount).toFixed(2)}</p>
                    <p className={`text-xs ${order.payment_status === "paid" ? "text-success" : order.payment_status === "pending" ? "text-warning" : "text-destructive"}`}>
                      {order.payment_status}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Overview;
