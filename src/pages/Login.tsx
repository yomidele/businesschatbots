import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Bot } from "lucide-react";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const { error } = await signIn(email, password);
    setIsLoading(false);
    if (error) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } else {
      navigate("/dashboard");
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Left branding panel */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-600 to-blue-700 items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center gap-2.5 mb-12 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/20 backdrop-blur">
              <Bot className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold text-white">AgentHub</span>
          </div>
          <h2 className="text-4xl font-bold text-white mb-6 leading-tight">
            Intelligent customer support, automated
          </h2>
          <p className="text-blue-100 leading-relaxed text-lg">
            Deploy AI-powered chat agents in seconds. No coding required.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-left">
            <div>
              <div className="text-2xl font-bold text-white mb-1">10K+</div>
              <p className="text-blue-100 text-sm">Active Users</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">99.9%</div>
              <p className="text-blue-100 text-sm">Uptime</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-white mb-1">24/7</div>
              <p className="text-blue-100 text-sm">Support</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <span className="font-bold text-lg">AgentHub</span>
          </div>

          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-gray-600">
              Don't have an account?{" "}
              <Link to="/signup" className="text-blue-600 hover:underline font-medium">Create one</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input 
                id="email" 
                type="email" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
                placeholder="you@example.com"
                className="h-10 border border-gray-300 rounded-lg"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <Input 
                id="password" 
                type="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                required 
                placeholder="••••••••"
                className="h-10 border border-gray-300 rounded-lg"
              />
            </div>

            <Button type="submit" className="w-full h-10 bg-blue-600 hover:bg-blue-700 mt-6" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>

          <div className="mt-8 text-center">
            <a href="#" className="text-sm text-blue-600 hover:underline">Forgot your password?</a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
