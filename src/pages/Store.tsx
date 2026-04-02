// @ts-nocheck
import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { Loader2, AlertCircle, ShoppingCart, DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import ChatInterface from "@/components/ChatInterface";
import { supabase } from "@/lib/supabase-external";

interface LandingPageData {
  business: {
    id: string;
    name: string;
    url: string;
    slug: string;
    welcome_message: string;
    currency: string;
    industry: string;
  };
  chat: {
    enabled: boolean;
    mode: string;
    welcome_message: string;
    ai_provider: string;
    ai_model: string;
  };
  products: Array<{
    id: string;
    name: string;
    description: string;
    price: number;
    image_url: string;
    category: string;
    stock: number;
  }>;
  payment: {
    mode: "none" | "gateway" | "manual";
    manual_config: {
      bank_name: string;
      account_name: string;
      account_number: string;
      instructions: string;
    } | null;
  };
}

export default function Store() {
  const { slug } = useParams<{ slug: string }>();
  const [data, setData] = useState<LandingPageData | null>(null);
  const [generatedHtml, setGeneratedHtml] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<LandingPageData["products"][0] | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  useEffect(() => {
    const fetchLandingPage = async () => {
      try {
        setLoading(true);

        // Check if this is a generated landing page (lp_ prefix)
        if (slug?.startsWith("lp_")) {
          const { data: lp, error: lpError } = await supabase
            .from("landing_pages")
            .select("*")
            .eq("id", slug)
            .single();

          if (!lpError && lp?.html_content) {
            setGeneratedHtml(lp.html_content);
            return;
          }
          // If not found in landing_pages, try as site slug
        }

        // Try edge function for site-based landing pages
        const supabaseUrl = 'https://eqemgveuvkdyectdzpzy.supabase.co';
        const response = await fetch(
          `${supabaseUrl}/functions/v1/get-landing-page?slug=${slug}`,
          { headers: { "Content-Type": "application/json" } }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Failed to load landing page");
        }

        const landingData = await response.json();
        setData(landingData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
      } finally {
        setLoading(false);
      }
    };

    if (slug) {
      fetchLandingPage();
    }
  }, [slug]);

  if (loading) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-12 h-12 animate-spin text-indigo-600" />
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // Render generated landing page HTML
  if (generatedHtml) {
    return (
      <div className="w-full min-h-screen" dangerouslySetInnerHTML={{ __html: generatedHtml }} />
    );
  }

  if (error || !data) {
    return (
      <div className="w-full h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-4">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error || "Business not found"}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="w-full min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-blue-600 text-white py-16 md:py-24">
        <div className="max-w-6xl mx-auto px-4 md:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">{data.business.name}</h1>
          <p className="text-xl text-indigo-100 mb-8">{data.business.welcome_message}</p>
          <div className="flex gap-4 flex-wrap">
            <Button
              size="lg"
              className="bg-white text-indigo-600 hover:bg-indigo-50"
              onClick={() => {
                const productsSection = document.getElementById("products");
                productsSection?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Explore Products
            </Button>
            {data.chat.enabled && (
              <Button
                size="lg"
                variant="outline"
                className="border-white text-white hover:bg-white/10"
                onClick={() => {
                  const chatSection = document.getElementById("chat");
                  chatSection?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                Chat with us
              </Button>
            )}
          </div>
        </div>
      </section>

      {/* Products Section */}
      {data.products.length > 0 && (
        <section id="products" className="py-16 md:py-24">
          <div className="max-w-6xl mx-auto px-4 md:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Our Products</h2>
            <p className="text-gray-600 mb-12">
              Discover our premium selection of quality products
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {data.products.map((product) => (
                <Card
                  key={product.id}
                  className="overflow-hidden hover:shadow-lg transition-shadow"
                >
                  {product.image_url && (
                    <div className="w-full h-48 bg-gray-200 overflow-hidden">
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <CardHeader>
                    <CardTitle>{product.name}</CardTitle>
                    {product.category && (
                      <CardDescription className="text-xs">{product.category}</CardDescription>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {product.description && (
                      <p className="text-sm text-gray-600">{product.description}</p>
                    )}

                    <div className="flex items-center justify-between pt-4 border-t">
                      <div className="flex items-center gap-2">
                        <DollarSign className="w-5 h-5 text-indigo-600" />
                        <span className="text-2xl font-bold">
                          {product.price.toFixed(2)}
                        </span>
                        <span className="text-gray-500">{data.business.currency}</span>
                      </div>
                    </div>

                    {product.stock !== undefined && (
                      <p className="text-sm text-gray-600">
                        {product.stock > 0 ? (
                          <span className="text-green-600">In Stock ({product.stock})</span>
                        ) : (
                          <span className="text-red-600">Out of Stock</span>
                        )}
                      </p>
                    )}

                    {data.payment.mode !== "none" && (
                      <Button
                        className="w-full"
                        onClick={() => {
                          setSelectedProduct(product);
                          setShowPaymentModal(true);
                        }}
                      >
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Buy Now
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Chat Section */}
      {data.chat.enabled && (
        <section id="chat" className="py-16 md:py-24 bg-gray-50">
          <div className="max-w-4xl mx-auto px-4 md:px-8">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Need Help? Chat with Our AI Sales Rep
            </h2>
            <p className="text-gray-600 mb-8">
              Our AI is here to answer questions and help you find the perfect product.
            </p>

            <Card className="overflow-hidden">
              <CardContent className="p-0 h-96">
                <ChatInterface
                  siteId={data.business.id}
                  siteName={data.business.name}
                  embedded={true}
                  welcomeMessage={data.chat.welcome_message}
                />
              </CardContent>
            </Card>
          </div>
        </section>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedProduct && (
        <PaymentModal
          product={selectedProduct}
          businessId={data.business.id}
          businessName={data.business.name}
          currency={data.business.currency}
          paymentMode={data.payment.mode}
          manualConfig={data.payment.manual_config}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedProduct(null);
          }}
        />
      )}
    </div>
  );
}

interface PaymentModalProps {
  product: any;
  businessId: string;
  businessName: string;
  currency: string;
  paymentMode: "none" | "gateway" | "manual";
  manualConfig: any;
  onClose: () => void;
}

function PaymentModal({
  product,
  businessId,
  businessName,
  currency,
  paymentMode,
  manualConfig,
  onClose,
}: PaymentModalProps) {
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentProof, setPaymentProof] = useState<File | null>(null);

  const totalAmount = product.price * quantity;

  const handleGatewayPayment = async () => {
    if (!customerEmail || !customerName) {
      setError("Please fill in all fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabaseUrl = 'https://eqemgveuvkdyectdzpzy.supabase.co';
      const response = await fetch(
        `${supabaseUrl}/functions/v1/create-payment-link`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            site_id: businessId,
            customer_email: customerEmail,
            customer_name: customerName,
            amount: totalAmount,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create payment link");
      }

      const data = await response.json();

      // Redirect to Paystack payment page
      if (data.authorization_url) {
        window.location.href = data.authorization_url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment failed");
    } finally {
      setLoading(false);
    }
  };

  const handleManualPayment = async () => {
    if (!customerEmail || !customerName || !paymentProof) {
      setError("Please fill in all fields and upload proof of payment");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabaseUrl = 'https://eqemgveuvkdyectdzpzy.supabase.co';
      const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVxZW1ndmV1dmtkeWVjdGR6cHp5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MzI1NzEsImV4cCI6MjA5MDIwODU3MX0.QixH7bgN8PsZLSYtsjPLBti7BxUV572vRIWr2mwBHvA';
      const supabase = (await import("@supabase/supabase-js")).createClient(
        supabaseUrl,
        supabaseKey
      );

      // Upload proof file to storage
      const timestamp = Date.now();
      const fileName = `${businessId}/${timestamp}-${paymentProof.name}`;
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("payment_proofs")
        .upload(fileName, paymentProof);

      if (uploadError) {
        throw new Error("Failed to upload proof");
      }

      // Get public URL
      const { data: publicData } = supabase.storage
        .from("payment_proofs")
        .getPublicUrl(fileName);

      // Create order
      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .insert({
          site_id: businessId,
          product_id: product.id,
          customer_name: customerName,
          customer_email: customerEmail,
          quantity: quantity,
          total_amount: totalAmount,
          payment_status: "pending",
        })
        .select()
        .single();

      if (orderError) {
        throw new Error("Failed to create order");
      }

      // Create payment confirmation
      const { error: confirmError } = await supabase
        .from("payment_confirmations")
        .insert({
          site_id: businessId,
          order_id: orderData.id,
          customer_email: customerEmail,
          proof_url: publicData.publicUrl,
          status: "pending",
        });

      if (confirmError) {
        throw new Error("Failed to save payment confirmation");
      }

      // Show success message
      alert(
        "Payment proof submitted! We'll review it and confirm your order shortly."
      );
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Payment submission failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="w-full max-w-md"
        onClick={(e) => e.stopPropagation()}
      >
        <CardHeader>
          <CardTitle>Complete Your Purchase</CardTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-lg">
            <p className="text-sm text-gray-600">Product</p>
            <p className="font-semibold">{product.name}</p>
            <p className="text-sm text-gray-600 mt-2">
              Quantity: {quantity}
            </p>
            <p className="text-lg font-bold text-indigo-600 mt-4">
              Total: {totalAmount.toFixed(2)} {currency}
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Email</label>
              <input
                type="email"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
                placeholder="your@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Quantity</label>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border rounded-lg"
              />
            </div>
          </div>

          {paymentMode === "manual" && manualConfig && (
            <>
              {/* Manual Payment Section */}
              <div className="border-t pt-4">
                <h3 className="font-semibold mb-3">Bank Transfer Details</h3>
                <div className="bg-blue-50 p-3 rounded-lg space-y-2 text-sm">
                  <div>
                    <p className="text-gray-600">Bank</p>
                    <p className="font-semibold">{manualConfig.bank_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Account Name</p>
                    <p className="font-semibold">{manualConfig.account_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Account Number</p>
                    <p className="font-semibold font-mono">
                      {manualConfig.account_number}
                    </p>
                  </div>
                  {manualConfig.instructions && (
                    <div className="pt-2 border-t">
                      <p className="text-gray-600">{manualConfig.instructions}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Upload Proof */}
              <div>
                <label className="block text-sm font-medium mb-1">
                  Upload Payment Proof
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setPaymentProof(e.target.files?.[0] || null)}
                  className="w-full"
                />
              </div>
            </>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={
                paymentMode === "gateway"
                  ? handleGatewayPayment
                  : handleManualPayment
              }
              disabled={loading}
              className="flex-1"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {paymentMode === "gateway"
                    ? "Pay with Paystack"
                    : "Submit Payment Proof"}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
