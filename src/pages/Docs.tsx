import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Copy, Check, ArrowLeft, Key, Zap, Code2, Globe, MessageSquare } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

const Docs = () => {
  const { toast } = useToast();

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copied!", description: `${label} copied to clipboard.` });
  };

  const appUrl = window.location.origin;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const widgetSnippet = `<!-- AgentHub Chat Widget -->
<script>
(function() {
  var w = document.createElement('div');
  w.id = 'agenthub-widget';
  w.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;';
  document.body.appendChild(w);

  var btn = document.createElement('button');
  btn.innerHTML = '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>';
  btn.style.cssText = 'width:56px;height:56px;border-radius:50%;background:#10b981;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 0.2s;';
  btn.onmouseenter = function() { btn.style.transform = 'scale(1.1)'; };
  btn.onmouseleave = function() { btn.style.transform = 'scale(1)'; };

  var frame = document.createElement('iframe');
  frame.src = '${appUrl}/widget/YOUR_SITE_ID';
  frame.style.cssText = 'width:380px;height:520px;border:none;border-radius:12px;box-shadow:0 10px 40px rgba(0,0,0,0.2);display:none;margin-bottom:12px;';

  w.appendChild(frame);
  w.appendChild(btn);

  btn.onclick = function() {
    frame.style.display = frame.style.display === 'none' ? 'block' : 'none';
  };
})();
</script>`;

  const apiSnippet = `// Send a message to the AgentHub Chat API
const response = await fetch('${supabaseUrl}/functions/v1/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_ANON_KEY',
  },
  body: JSON.stringify({
    siteId: 'YOUR_SITE_ID',
    messages: [
      { role: 'user', content: 'What services do you offer?' }
    ],
    // Optional: pass conversationId to persist messages
    // conversationId: 'uuid-here'
  }),
});

// The response is a streaming SSE response
const reader = response.body.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value, { stream: true });
  const lines = chunk.split('\\n');
  
  for (const line of lines) {
    if (!line.startsWith('data: ')) continue;
    const json = line.slice(6).trim();
    if (json === '[DONE]') break;
    
    const parsed = JSON.parse(json);
    const token = parsed.choices?.[0]?.delta?.content;
    if (token) process.stdout.write(token); // or append to UI
  }
}`;

  const reactSnippet = `import { useState, useRef, useEffect } from 'react';

type Message = { role: 'user' | 'assistant'; content: string };

export function AgentHubChat({ siteId }: { siteId: string }) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;
    const userMsg: Message = { role: 'user', content: input.trim() };
    const allMsgs = [...messages, userMsg];
    setMessages(allMsgs);
    setInput('');
    setLoading(true);

    let assistantText = '';

    try {
      const resp = await fetch('${supabaseUrl}/functions/v1/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer YOUR_ANON_KEY',
        },
        body: JSON.stringify({ siteId, messages: allMsgs }),
      });

      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buf = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });

        let idx;
        while ((idx = buf.indexOf('\\n')) !== -1) {
          const line = buf.slice(0, idx).trim();
          buf = buf.slice(idx + 1);
          if (!line.startsWith('data: ')) continue;
          const json = line.slice(6).trim();
          if (json === '[DONE]') break;
          try {
            const parsed = JSON.parse(json);
            const token = parsed.choices?.[0]?.delta?.content;
            if (token) {
              assistantText += token;
              setMessages([...allMsgs, { role: 'assistant', content: assistantText }]);
            }
          } catch {}
        }
      }
    } catch (err) {
      console.error('Chat error:', err);
      setMessages([...allMsgs, { role: 'assistant', content: 'Something went wrong.' }]);
    }

    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 400, margin: 'auto', fontFamily: 'sans-serif' }}>
      <div style={{ height: 400, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 12, padding: 16, marginBottom: 8 }}>
        {messages.map((m, i) => (
          <div key={i} style={{ textAlign: m.role === 'user' ? 'right' : 'left', margin: '8px 0' }}>
            <span style={{
              display: 'inline-block', padding: '8px 14px', borderRadius: 16,
              background: m.role === 'user' ? '#10b981' : '#f3f4f6',
              color: m.role === 'user' ? '#fff' : '#111',
              maxWidth: '80%', textAlign: 'left', fontSize: 14
            }}>{m.content}</span>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <input
          value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Type a message..."
          style={{ flex: 1, padding: '10px 14px', borderRadius: 8, border: '1px solid #d1d5db', fontSize: 14 }}
        />
        <button onClick={sendMessage} disabled={loading}
          style={{ padding: '10px 20px', borderRadius: 8, background: '#10b981', color: '#fff', border: 'none', cursor: 'pointer', fontSize: 14 }}>
          Send
        </button>
      </div>
    </div>
  );
}`;

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-8">
        <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
          <Link to="/dashboard"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Integration Docs</h1>
          <p className="text-sm text-muted-foreground mt-1">Everything you need to integrate AgentHub into your app</p>
        </div>
      </div>

      {/* Setup checklist */}
      <div className="border rounded-lg p-5 mb-8 bg-muted/30">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><Zap className="h-4 w-4 text-primary" /> Setup Checklist</h2>
        <ol className="space-y-2 text-sm text-muted-foreground list-decimal list-inside">
          <li><strong className="text-foreground">Create an account</strong> — Sign up at <code className="text-xs bg-muted px-1 py-0.5 rounded">{appUrl}/signup</code></li>
          <li><strong className="text-foreground">Add your website</strong> — Go to Dashboard → New Site and enter your URL</li>
          <li><strong className="text-foreground">Configure AI provider</strong> — Choose between <Badge variant="outline" className="text-xs">OpenAI</Badge> or <Badge variant="outline" className="text-xs">Groq</Badge> and pick a model</li>
          <li><strong className="text-foreground">Crawl your site</strong> — Click the crawl button to extract content from your pages</li>
          <li><strong className="text-foreground">Test the chat</strong> — Use the test chat to verify the AI responds correctly</li>
          <li><strong className="text-foreground">Embed or integrate</strong> — Use the widget snippet or API below</li>
        </ol>
      </div>

      {/* API Keys needed */}
      <div className="border rounded-lg p-5 mb-8">
        <h2 className="text-base font-semibold mb-3 flex items-center gap-2"><Key className="h-4 w-4 text-primary" /> API Keys Required</h2>
        <div className="space-y-3 text-sm">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Badge variant="outline" className="mt-0.5 shrink-0">OpenAI</Badge>
            <div>
              <p className="font-medium text-foreground">OPENAI_API_KEY</p>
              <p className="text-muted-foreground text-xs">Get from <a href="https://platform.openai.com/api-keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">platform.openai.com/api-keys</a>. Supports GPT-4o, GPT-4o Mini, GPT-4 Turbo, GPT-3.5 Turbo.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Badge variant="outline" className="mt-0.5 shrink-0">Groq</Badge>
            <div>
              <p className="font-medium text-foreground">GROQ_API_KEY</p>
              <p className="text-muted-foreground text-xs">Get from <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-primary hover:underline">console.groq.com/keys</a>. Supports Llama 3.3 70B, Llama 3.1 8B, Mixtral, Gemma 2.</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
            <Badge variant="outline" className="mt-0.5 shrink-0">Firecrawl</Badge>
            <div>
              <p className="font-medium text-foreground">FIRECRAWL_API_KEY</p>
              <p className="text-muted-foreground text-xs">Get from <a href="https://www.firecrawl.dev" target="_blank" rel="noreferrer" className="text-primary hover:underline">firecrawl.dev</a>. Used to crawl and extract website content.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Widget Embed */}
      <CodeBlock
        title="Widget Embed Snippet"
        description="Paste before </body> on any HTML page. Replace YOUR_SITE_ID with your site's ID from the dashboard."
        icon={<Globe className="h-4 w-4 text-primary" />}
        code={widgetSnippet}
        language="html"
        onCopy={() => copyToClipboard(widgetSnippet, "Widget snippet")}
      />

      {/* API Integration */}
      <CodeBlock
        title="API Integration (JavaScript/Node.js)"
        description="Call the chat API directly from any backend or frontend. Streaming SSE response."
        icon={<Code2 className="h-4 w-4 text-primary" />}
        code={apiSnippet}
        language="javascript"
        onCopy={() => copyToClipboard(apiSnippet, "API snippet")}
      />

      {/* React Component */}
      <CodeBlock
        title="React Component"
        description="Drop-in React chat component with streaming support."
        icon={<MessageSquare className="h-4 w-4 text-primary" />}
        code={reactSnippet}
        language="tsx"
        onCopy={() => copyToClipboard(reactSnippet, "React component")}
      />
    </div>
  );
};

const CodeBlock = ({
  title, description, icon, code, language, onCopy,
}: {
  title: string; description: string; icon: React.ReactNode; code: string; language: string; onCopy: () => void;
}) => {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="border rounded-lg mb-6 overflow-hidden">
      <div className="px-4 py-3 border-b bg-muted/50 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium flex items-center gap-2">{icon} {title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
        </div>
        <Button size="sm" variant="outline" className="h-7 text-xs shrink-0" onClick={handleCopy}>
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
