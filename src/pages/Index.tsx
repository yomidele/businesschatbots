import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Bot, Globe, MessageSquare, Code, Zap, Shield } from "lucide-react";
import { motion } from "framer-motion";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="border-b bg-card/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Bot className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold">AgentHub</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" asChild><Link to="/login">Sign in</Link></Button>
            <Button asChild><Link to="/signup">Get Started</Link></Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="container py-20 md:py-32 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm text-accent-foreground mb-6">
            <Zap className="h-3.5 w-3.5" />
            AI-powered customer support
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 max-w-3xl mx-auto leading-tight">
            Turn any website into an{" "}
            <span className="text-primary">AI sales agent</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Connect your website, and we'll build an AI agent that knows your business inside out.
            It answers questions, drives sales, and works 24/7.
          </p>
          <div className="flex gap-4 justify-center flex-wrap">
            <Button size="lg" asChild><Link to="/signup">Start for free</Link></Button>
            <Button size="lg" variant="outline" asChild><Link to="/login">Sign in</Link></Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="container py-20 border-t">
        <div className="text-center mb-16">
          <h2 className="text-3xl font-bold mb-3">How it works</h2>
          <p className="text-muted-foreground max-w-xl mx-auto">Three steps to deploy your AI support agent</p>
        </div>
        <div className="grid gap-8 md:grid-cols-3 max-w-4xl mx-auto">
          {[
            { icon: Globe, title: "Connect your site", desc: "Enter your website URL and we'll crawl and understand your content automatically." },
            { icon: MessageSquare, title: "AI learns your business", desc: "Your agent builds a knowledge base from your services, pricing, FAQs, and policies." },
            { icon: Code, title: "Deploy everywhere", desc: "Test in our dashboard or embed a chat widget on your website with one script tag." },
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.15 }}
              viewport={{ once: true }}
              className="text-center"
            >
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-accent">
                <feature.icon className="h-6 w-6 text-accent-foreground" />
              </div>
              <h3 className="font-semibold mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Trust bar */}
      <section className="container py-16 border-t">
        <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
          {[
            { icon: Shield, text: "Enterprise-grade security" },
            { icon: Zap, text: "Sub-2 second responses" },
            { icon: Bot, text: "Adapts to any business" },
          ].map((item, i) => (
            <div key={i} className="flex items-center gap-2 text-sm">
              <item.icon className="h-4 w-4" />
              {item.text}
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} AgentHub. AI-powered customer support.
        </div>
      </footer>
    </div>
  );
};

export default Index;
