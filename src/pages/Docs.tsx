import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check, ArrowLeft, Globe, MessageSquare, ShoppingCart, Users, Zap } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const Docs = () => {
  const { toast } = useToast();
  const appUrl = window.location.origin;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const widgetSnippet = `<!-- AI Sales Rep Widget -->
<script>
(function() {
  var w = document.createElement('div');
  w.id = 'salesrep-widget';
  w.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;';
  document.body.appendChild(w);

  var btn = document.createElement('button');
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.style.cssText = 'width:56px;height:56px;border-radius:50%;background:hsl(160,84%,39%);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);';

  var frame = document.createElement('iframe');
  frame.src = '${appUrl}/widget/YOUR_SITE_ID';
  frame.style.cssText = 'width:380px;height:520px;border:none;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.15);display:none;margin-bottom:12px;';

  w.appendChild(frame);
  w.appendChild(btn);

  btn.onclick = function() {
    frame.style.display = frame.style.display === 'none' ? 'block' : 'none';
  };
})();
</script>`;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-6 sm:mb-8">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold tracking-tight">How to Use</h1>
          <p className="text-sm text-muted-foreground mt-1">Get your AI Sales Rep up and running</p>
        </div>
      </div>

      {/* Setup Guide */}
      <div className="border rounded-lg p-4 sm:p-5 mb-6 bg-muted/30">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2">
          <Zap className="h-4 w-4 text-primary" /> Getting Started
        </h2>
        <ol className="space-y-3 text-sm text-muted-foreground list-decimal list-inside">
          <li><strong className="text-foreground">Create your account</strong> — Sign up for free</li>
          <li><strong className="text-foreground">Add your business</strong> — Go to <strong className="text-foreground">Sales Reps → New Sales Rep</strong>, enter your website URL, select your industry and currency</li>
          <li><strong className="text-foreground">Train your Sales Rep</strong> — Click the refresh button to crawl your website. The AI learns your products, services, and pricing</li>
          <li><strong className="text-foreground">Test the experience</strong> — Use the chat icon to test your Sales Rep and see how it handles customer conversations</li>
          <li><strong className="text-foreground">Deploy on your website</strong> — Copy the embed code and paste it into your website's HTML</li>
          <li><strong className="text-foreground">Connect payments</strong> — Go to <strong className="text-foreground">Payments</strong> and add Paystack or Flutterwave to accept in-chat payments</li>
        </ol>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        {[
          { icon: Users, title: "AI Sales Rep", desc: "Your Sales Rep acts as a trained digital salesperson — recommending products, answering questions, and closing deals." },
          { icon: Globe, title: "Website Integration", desc: "Deploy on any website with a single script tag. Works with WordPress, Shopify, Wix, and custom sites." },
          { icon: ShoppingCart, title: "In-Chat Checkout", desc: "Customers can browse, select, and pay for products without ever leaving the conversation." },
          { icon: MessageSquare, title: "Persistent History", desc: "Chat history is saved automatically. Returning customers pick up right where they left off." },
        ].map((f, i) => (
          <div key={i} className="border rounded-lg p-4">
            <f.icon className="h-5 w-5 text-primary mb-2" />
            <h3 className="font-medium text-sm mb-1">{f.title}</h3>
            <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* Embed Code */}
      <CodeBlock
        title="Website Embed Code"
        description="Paste before </body> on any HTML page. Replace YOUR_SITE_ID with your Sales Rep ID from the dashboard."
        icon={<Globe className="h-4 w-4 text-primary" />}
        code={widgetSnippet}
        onCopy={() => copyToClipboard(widgetSnippet, "Embed code")}
      />
    </div>
  );
};

const CodeBlock = ({ title, description, icon, code, onCopy }: {
  title: string; description: string; icon: React.ReactNode; code: string; onCopy: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => { onCopy(); setCopied(true); setTimeout(() => setCopied(false), 2000); };

  return (
    <div className="border rounded-lg mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">{icon} {title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0 w-fit" onClick={handleCopy}>
          {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
      <pre className="p-4 text-xs font-mono overflow-x-auto whitespace-pre-wrap break-all leading-relaxed text-muted-foreground bg-background">
        {code}
      </pre>
    </div>
  );
};

export default Docs;
