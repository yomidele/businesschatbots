import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Users } from "lucide-react";

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
    <div className="flex min-h-screen bg-background">
      {/* Left branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-primary items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center gap-2.5 mb-12 justify-center">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-foreground/20 backdrop-blur">
              <Users className="h-6 w-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold text-primary-foreground">AI Sales Rep</span>
          </div>
          <h2 className="text-3xl font-bold text-primary-foreground mb-6 leading-tight">
            Your 24/7 digital sales workforce
          </h2>
          <p className="text-primary-foreground/80 leading-relaxed text-lg">
            Deploy AI Sales Reps that close deals, process payments, and convert visitors into customers — automatically.
          </p>
          <div className="mt-12 grid grid-cols-3 gap-6 text-left">
            <div>
              <div className="text-2xl font-bold text-primary-foreground mb-1">10K+</div>
              <p className="text-primary-foreground/70 text-sm">Businesses</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-foreground mb-1">99.9%</div>
              <p className="text-primary-foreground/70 text-sm">Uptime</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-primary-foreground mb-1">24/7</div>
              <p className="text-primary-foreground/70 text-sm">Always Selling</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-10">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Users className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="font-bold text-lg">AI Sales Rep</span>
          </div>

          <div className="mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold mb-2">Welcome back</h1>
            <p className="text-muted-foreground">
              Don't have an account?{" "}
              <Link to="/signup" className="text-primary hover:underline font-medium">Create one</Link>
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="you@example.com" className="h-10" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="••••••••" className="h-10" />
            </div>
            <Button type="submit" className="w-full h-10 mt-6" disabled={isLoading}>
              {isLoading ? "Signing in..." : "Sign in"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
