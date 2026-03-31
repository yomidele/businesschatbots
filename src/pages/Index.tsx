import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Users, Globe, ShoppingCart, Code, Zap, Shield, ArrowRight, BarChart3, MessageSquare } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container flex h-14 items-center justify-between px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
              <Users className="h-4 w-4 text-primary-foreground" />
            </div>
            <span className="font-semibold text-sm sm:text-base">AI Sales Rep</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" asChild><Link to="/login">Sign in</Link></Button>
            <Button size="sm" asChild><Link to="/signup">Get Started <ArrowRight className="ml-1 h-3 w-3" /></Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="border-b">
        <div className="container py-16 sm:py-24 md:py-32 max-w-4xl text-center px-4">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="inline-flex items-center gap-1.5 rounded-full border bg-muted px-3 py-1 text-xs text-muted-foreground mb-6 sm:mb-8">
              <Zap className="h-3 w-3 text-primary" />
              AI-powered digital sales workforce
            </div>
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight mb-4 sm:mb-5 leading-[1.1]">
              Deploy an AI Sales Rep for
              <span className="text-primary"> every business</span>
            </h1>
            <p className="text-sm sm:text-base md:text-lg text-muted-foreground max-w-2xl mx-auto mb-6 sm:mb-8 leading-relaxed px-2">
              Not a chatbot — a trained digital salesperson that discovers products, closes deals, and processes payments 24/7 inside the conversation.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Button size="lg" asChild><Link to="/signup">Start Free <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
              <Button size="lg" variant="outline" asChild><Link to="/login">Sign in</Link></Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b">
        <div className="container py-16 sm:py-20 px-4">
          <div className="text-center mb-12 sm:mb-16">
            <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-3">How it works</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">Three steps to deploy your AI Sales Rep</p>
          </div>
          <div className="grid gap-4 sm:gap-px md:grid-cols-3 max-w-4xl mx-auto sm:border sm:rounded-lg sm:overflow-hidden sm:bg-border">
            {[
              { icon: Globe, title: "Connect your business", desc: "Add your website URL. We crawl and extract your products, prices, and services automatically." },
              { icon: MessageSquare, title: "AI learns to sell", desc: "Your Sales Rep builds a product catalog and learns how to recommend, upsell, and close deals." },
              { icon: ShoppingCart, title: "Customers buy in chat", desc: "Deploy on your website or landing page. Customers discover, order, and pay — all inside the conversation." },
            ].map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                className="bg-background p-6 sm:p-8 border sm:border-0 rounded-lg sm:rounded-none"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                  <feature.icon className="h-5 w-5 text-foreground" />
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b">
        <div className="container py-10 sm:py-12 px-4">
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
            {[
              { icon: Shield, text: "Enterprise-grade security" },
              { icon: Zap, text: "Sub-2s response times" },
              { icon: BarChart3, text: "Sales analytics" },
              { icon: Users, text: "Multi-tenant isolation" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <item.icon className="h-4 w-4 text-primary" />
                <span className="text-xs sm:text-sm">{item.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b">
        <div className="container py-16 sm:py-20 text-center px-4">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4">Ready to deploy your AI Sales Rep?</h2>
          <p className="text-muted-foreground text-sm mb-8 max-w-md mx-auto">
            Turn website visitors into paying customers. No coding required.
          </p>
          <Button size="lg" asChild><Link to="/signup">Create free account <ArrowRight className="ml-1 h-4 w-4" /></Link></Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-6 px-4">
        <div className="container text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} AI Sales Rep Platform. All rights reserved.
        </div>
      </footer>
    </div>
  );
};

export default Index;
