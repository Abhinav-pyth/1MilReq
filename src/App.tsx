import { useState } from 'react';
import { Server, Database, Zap, Shield, Code, Layers, Rocket, ChevronRight, Copy, Check, Github, ExternalLink } from 'lucide-react';
import { ArchitectureDiagram } from './components/ArchitectureDiagram';
import { CodeBlock } from './components/CodeBlock';
import { javaCode, supabaseConfig, nginxConfig, dockerConfig, pomXml, applicationYaml, k8sConfig, benchmarkScript } from './data/codeSnippets';

type Tab = 'overview' | 'architecture' | 'code' | 'config' | 'deploy' | 'benchmark';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  const copyToClipboard = (text: string, section: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(section);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const tabs: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Zap size={18} /> },
    { id: 'architecture', label: 'Architecture', icon: <Layers size={18} /> },
    { id: 'code', label: 'Java Code', icon: <Code size={18} /> },
    { id: 'config', label: 'Configuration', icon: <Server size={18} /> },
    { id: 'deploy', label: 'Deployment', icon: <Rocket size={18} /> },
    { id: 'benchmark', label: 'Benchmark', icon: <Shield size={18} /> },
  ];

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-950/80 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                <Zap size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">1M RPS Java System</h1>
                <p className="text-xs text-gray-400">High-Performance Architecture with Supabase</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="p-2 rounded-lg hover:bg-gray-800 transition-colors">
                <Github size={20} className="text-gray-400" />
              </a>
              <a href="https://supabase.com" target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm hover:bg-emerald-500/20 transition-colors flex items-center gap-1.5">
                <Database size={14} />
                Supabase
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex gap-1 overflow-x-auto py-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                  activeTab === tab.id
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && <OverviewSection />}
        {activeTab === 'architecture' && <ArchitectureSection />}
        {activeTab === 'code' && <CodeSection copyToClipboard={copyToClipboard} copiedSection={copiedSection} />}
        {activeTab === 'config' && <ConfigSection copyToClipboard={copyToClipboard} copiedSection={copiedSection} />}
        {activeTab === 'deploy' && <DeploySection />}
        {activeTab === 'benchmark' && <BenchmarkSection copyToClipboard={copyToClipboard} copiedSection={copiedSection} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-gray-500 text-sm">
          <p>Architecture designed for 1,000,000 requests/second • Java 21 + Spring Boot 3 + WebFlux + Supabase</p>
        </div>
      </footer>
    </div>
  );
}

function OverviewSection() {
  const stats = [
    { label: 'Target Throughput', value: '1M RPS', className: 'text-emerald-400' },
    { label: 'Response Time (p99)', value: '< 5ms', className: 'text-cyan-400' },
    { label: 'Error Rate', value: '< 0.01%', className: 'text-purple-400' },
    { label: 'Nodes Required', value: '10-20', className: 'text-amber-400' },
  ];

  const features = [
    {
      icon: <Zap className="text-yellow-400" size={24} />,
      title: 'Reactive Non-Blocking I/O',
      description: 'Spring WebFlux with Netty handles connections without thread-per-request model, enabling millions of concurrent connections with minimal memory.'
    },
    {
      icon: <Database className="text-emerald-400" size={24} />,
      title: 'Supabase Integration',
      description: 'PostgreSQL-backed Supabase with connection pooling via PgBouncer, read replicas, and caching layer for database operations.'
    },
    {
      icon: <Shield className="text-cyan-400" size={24} />,
      title: 'Horizontal Scaling',
      description: 'Stateless design with Kubernetes auto-scaling. Each node handles ~50K-100K RPS independently.'
    },
    {
      icon: <Server className="text-purple-400" size={24} />,
      title: 'Multi-Layer Caching',
      description: 'Redis cluster for hot data, Caffeine for L1 cache, CDN edge caching for static responses.'
    },
    {
      icon: <Layers className="text-amber-400" size={24} />,
      title: 'Load Balancing',
      description: 'NGINX Plus / AWS ALB with health checks, circuit breakers, and rate limiting at the edge.'
    },
    {
      icon: <Rocket className="text-rose-400" size={24} />,
      title: 'Zero-Downtime Deploy',
      description: 'Blue-green deployments with rolling updates, health probes, and automatic rollback on failure.'
    },
  ];

  return (
    <div className="space-y-8">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-900 to-emerald-950 border border-gray-800 p-8 md:p-12">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-500/10 via-transparent to-transparent"></div>
        <div className="relative">
          <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Handling <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">1 Million</span> Requests/Second
          </h2>
          <p className="text-gray-300 text-lg max-w-3xl mb-6">
            A production-ready architecture using Java 21, Spring Boot 3 WebFlux, and Supabase as the database layer. 
            Designed for extreme throughput with sub-5ms latency at the 99th percentile.
          </p>
          <div className="flex flex-wrap gap-3">
            <span className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">Java 21</span>
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm">Spring WebFlux</span>
            <span className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 text-sm">Supabase</span>
            <span className="px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-sm">Kubernetes</span>
            <span className="px-3 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm">Redis</span>
            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm">NGINX</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-6 text-center">
            <div className={`text-3xl font-bold ${stat.className} mb-1`}>{stat.value}</div>
            <div className="text-sm text-gray-400">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Features Grid */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {features.map((feature, i) => (
          <div key={i} className="rounded-xl bg-gray-900 border border-gray-800 p-6 hover:border-gray-700 transition-colors">
            <div className="mb-3">{feature.icon}</div>
            <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
            <p className="text-gray-400 text-sm leading-relaxed">{feature.description}</p>
          </div>
        ))}
      </div>

      {/* Important Note */}
      <div className="rounded-xl bg-amber-500/5 border border-amber-500/20 p-6">
        <div className="flex gap-3">
          <div className="text-amber-400 mt-0.5">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <div>
            <h4 className="text-amber-400 font-semibold mb-1">Deployment Note</h4>
            <p className="text-gray-300 text-sm">
              Vercel is optimized for serverless functions and doesn't natively support Java runtime. 
              For this architecture, deploy the Java service to <strong>AWS ECS/EKS</strong>, <strong>Google Cloud Run</strong>, or <strong>Railway</strong>. 
              You can use Vercel for the frontend/API gateway layer that proxies to the Java backend. 
              Alternatively, use <strong>Vercel Edge Functions</strong> (JavaScript/WASM) for the API layer with Supabase direct integration.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function ArchitectureSection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">System Architecture</h2>
        <p className="text-gray-400">Multi-tier architecture designed for maximum throughput</p>
      </div>
      
      <ArchitectureDiagram />

      {/* Architecture Details */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
            Request Flow
          </h3>
          <ol className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono text-xs mt-0.5">01</span>
              <span>Client request hits CDN edge (Cloudflare/Fastly) for static content</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono text-xs mt-0.5">02</span>
              <span>API Gateway (NGINX/Kong) performs rate limiting, auth, and routing</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono text-xs mt-0.5">03</span>
              <span>Load Balancer distributes across Kubernetes pod replicas</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono text-xs mt-0.5">04</span>
              <span>Spring WebFlux handles request on Netty event loop (non-blocking)</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono text-xs mt-0.5">05</span>
              <span>L1 Cache (Caffeine) → L2 Cache (Redis Cluster) → Supabase DB</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-mono text-xs mt-0.5">06</span>
              <span>Response serialized and returned through the chain</span>
            </li>
          </ol>
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-cyan-400"></div>
            Key Design Decisions
          </h3>
          <ul className="space-y-3 text-sm text-gray-300">
            <li className="flex items-start gap-2">
              <ChevronRight size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Virtual Threads (Java 21):</strong> Lightweight threads for blocking operations like DB calls</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Reactive Streams:</strong> Back-pressure handling prevents cascade failures</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Connection Pooling:</strong> R2DBC with PgBouncer for optimal DB connections</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Stateless Services:</strong> No session affinity needed, enables horizontal scaling</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Circuit Breakers:</strong> Resilience4j prevents cascading failures</span>
            </li>
            <li className="flex items-start gap-2">
              <ChevronRight size={14} className="text-cyan-400 mt-0.5 shrink-0" />
              <span><strong className="text-white">Async DB Writes:</strong> Write-behind pattern for non-critical data</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Capacity Planning */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Capacity Planning</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Component</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Specs</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Instances</th>
                <th className="text-left py-3 px-4 text-gray-400 font-medium">RPS Capacity</th>
              </tr>
            </thead>
            <tbody className="text-gray-300">
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Java App Node</td>
                <td className="py-3 px-4">8 vCPU, 16GB RAM</td>
                <td className="py-3 px-4">15</td>
                <td className="py-3 px-4 text-emerald-400">~67K RPS each</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Redis Cluster</td>
                <td className="py-3 px-4">6 nodes, 32GB each</td>
                <td className="py-3 px-4">6</td>
                <td className="py-3 px-4 text-emerald-400">~1M+ RPS</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">Supabase (PgBouncer)</td>
                <td className="py-3 px-4">Connection pooling</td>
                <td className="py-3 px-4">3</td>
                <td className="py-3 px-4 text-emerald-400">~500K RPS</td>
              </tr>
              <tr className="border-b border-gray-800">
                <td className="py-3 px-4">NGINX Load Balancer</td>
                <td className="py-3 px-4">4 vCPU, 8GB RAM</td>
                <td className="py-3 px-4">4</td>
                <td className="py-3 px-4 text-emerald-400">~300K RPS each</td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-white">Total System</td>
                <td className="py-3 px-4">—</td>
                <td className="py-3 px-4">—</td>
                <td className="py-3 px-4 text-emerald-400 font-bold">1,000,000+ RPS</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function CodeSection({ copyToClipboard, copiedSection }: { copyToClipboard: (text: string, section: string) => void; copiedSection: string | null }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Java Source Code</h2>
        <p className="text-gray-400">Core application code for the high-performance API server</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Code size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-gray-200">Application.java</span>
              <span className="text-xs text-gray-500">- Main Application Entry Point</span>
            </div>
            <button 
              onClick={() => copyToClipboard(javaCode.main, 'main')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'main' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'main' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={javaCode.main} language="java" />
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Code size={16} className="text-cyan-400" />
              <span className="text-sm font-medium text-gray-200">RequestController.java</span>
              <span className="text-xs text-gray-500">- Reactive REST Controller</span>
            </div>
            <button 
              onClick={() => copyToClipboard(javaCode.controller, 'controller')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'controller' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'controller' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={javaCode.controller} language="java" />
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-purple-400" />
              <span className="text-sm font-medium text-gray-200">SupabaseService.java</span>
              <span className="text-xs text-gray-500">- Supabase Integration Layer</span>
            </div>
            <button 
              onClick={() => copyToClipboard(javaCode.supabase, 'supabase')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'supabase' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'supabase' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={javaCode.supabase} language="java" />
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Zap size={16} className="text-amber-400" />
              <span className="text-sm font-medium text-gray-200">CacheService.java</span>
              <span className="text-xs text-gray-500">- Multi-Layer Cache Implementation</span>
            </div>
            <button 
              onClick={() => copyToClipboard(javaCode.cache, 'cache')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'cache' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'cache' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={javaCode.cache} language="java" />
        </div>
      </div>
    </div>
  );
}

function ConfigSection({ copyToClipboard, copiedSection }: { copyToClipboard: (text: string, section: string) => void; copiedSection: string | null }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Configuration Files</h2>
        <p className="text-gray-400">Build, runtime, and infrastructure configuration</p>
      </div>

      <div className="space-y-6">
        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-emerald-400" />
              <span className="text-sm font-medium text-gray-200">pom.xml</span>
              <span className="text-xs text-gray-500">- Maven Dependencies</span>
            </div>
            <button 
              onClick={() => copyToClipboard(pomXml, 'pom')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'pom' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'pom' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={pomXml} language="xml" />
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-cyan-400" />
              <span className="text-sm font-medium text-gray-200">application.yml</span>
              <span className="text-xs text-gray-500">- Spring Boot Configuration</span>
            </div>
            <button 
              onClick={() => copyToClipboard(applicationYaml, 'yaml')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'yaml' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'yaml' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={applicationYaml} language="yaml" />
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Database size={16} className="text-purple-400" />
              <span className="text-sm font-medium text-gray-200">supabase-config.java</span>
              <span className="text-xs text-gray-500">- Supabase Client Configuration</span>
            </div>
            <button 
              onClick={() => copyToClipboard(supabaseConfig, 'supaconfig')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'supaconfig' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'supaconfig' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={supabaseConfig} language="java" />
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Server size={16} className="text-amber-400" />
              <span className="text-sm font-medium text-gray-200">nginx.conf</span>
              <span className="text-xs text-gray-500">- NGINX Load Balancer Configuration</span>
            </div>
            <button 
              onClick={() => copyToClipboard(nginxConfig, 'nginx')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'nginx' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'nginx' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={nginxConfig} language="nginx" />
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-rose-400" />
              <span className="text-sm font-medium text-gray-200">Dockerfile</span>
              <span className="text-xs text-gray-500">- Container Configuration</span>
            </div>
            <button 
              onClick={() => copyToClipboard(dockerConfig, 'docker')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'docker' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'docker' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={dockerConfig} language="dockerfile" />
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
            <div className="flex items-center gap-2">
              <Layers size={16} className="text-blue-400" />
              <span className="text-sm font-medium text-gray-200">k8s-deployment.yaml</span>
              <span className="text-xs text-gray-500">- Kubernetes Deployment</span>
            </div>
            <button 
              onClick={() => copyToClipboard(k8sConfig, 'k8s')}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
            >
              {copiedSection === 'k8s' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              {copiedSection === 'k8s' ? 'Copied!' : 'Copy'}
            </button>
          </div>
          <CodeBlock code={k8sConfig} language="yaml" />
        </div>
      </div>
    </div>
  );
}

function DeploySection() {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Deployment Guide</h2>
        <p className="text-gray-400">Step-by-step deployment instructions</p>
      </div>

      {/* Deployment Options */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Rocket size={20} className="text-orange-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Option A: Railway / Render</h3>
              <p className="text-xs text-gray-400">Easiest for Java deployment</p>
            </div>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-orange-400">1.</span> Push code to GitHub repository</li>
            <li className="flex gap-2"><span className="text-orange-400">2.</span> Connect repo to Railway/Render</li>
            <li className="flex gap-2"><span className="text-orange-400">3.</span> Set build command: <code className="text-emerald-400 bg-gray-800 px-1 rounded">mvn clean package</code></li>
            <li className="flex gap-2"><span className="text-orange-400">4.</span> Set start command: <code className="text-emerald-400 bg-gray-800 px-1 rounded">java -jar target/app.jar</code></li>
            <li className="flex gap-2"><span className="text-orange-400">5.</span> Configure environment variables</li>
            <li className="flex gap-2"><span className="text-orange-400">6.</span> Scale replicas to 15+</li>
          </ol>
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Layers size={20} className="text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Option B: AWS ECS/EKS</h3>
              <p className="text-xs text-gray-400">Maximum control & scaling</p>
            </div>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-blue-400">1.</span> Build Docker image and push to ECR</li>
            <li className="flex gap-2"><span className="text-blue-400">2.</span> Create ECS cluster with Fargate or EC2</li>
            <li className="flex gap-2"><span className="text-blue-400">3.</span> Configure auto-scaling (target: 60% CPU)</li>
            <li className="flex gap-2"><span className="text-blue-400">4.</span> Set up ALB with target groups</li>
            <li className="flex gap-2"><span className="text-blue-400">5.</span> Configure VPC, subnets, security groups</li>
            <li className="flex gap-2"><span className="text-blue-400">6.</span> Enable CloudWatch monitoring</li>
          </ol>
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Server size={20} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Option C: Vercel + Java Backend</h3>
              <p className="text-xs text-gray-400">Hybrid approach</p>
            </div>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-emerald-400">1.</span> Deploy Java API to Railway/AWS</li>
            <li className="flex gap-2"><span className="text-emerald-400">2.</span> Create Vercel project for frontend</li>
            <li className="flex gap-2"><span className="text-emerald-400">3.</span> Use Vercel Edge Functions as API proxy</li>
            <li className="flex gap-2"><span className="text-emerald-400">4.</span> Configure CORS on Java backend</li>
            <li className="flex gap-2"><span className="text-emerald-400">5.</span> Set up custom domain routing</li>
            <li className="flex gap-2"><span className="text-emerald-400">6.</span> Enable Vercel analytics & monitoring</li>
          </ol>
        </div>

        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Database size={20} className="text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Supabase Setup</h3>
              <p className="text-xs text-gray-400">Database configuration</p>
            </div>
          </div>
          <ol className="space-y-2 text-sm text-gray-300">
            <li className="flex gap-2"><span className="text-purple-400">1.</span> Create Supabase project (free tier or Pro)</li>
            <li className="flex gap-2"><span className="text-purple-400">2.</span> Run SQL migrations for tables</li>
            <li className="flex gap-2"><span className="text-purple-400">3.</span> Enable read replicas (Pro plan)</li>
            <li className="flex gap-2"><span className="text-purple-400">4.</span> Configure PgBouncer connection limits</li>
            <li className="flex gap-2"><span className="text-purple-400">5.</span> Set up RLS policies for security</li>
            <li className="flex gap-2"><span className="text-purple-400">6.</span> Get API URL and anon/service keys</li>
          </ol>
        </div>
      </div>

      {/* Environment Variables */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Required Environment Variables</h3>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { name: 'SUPABASE_URL', desc: 'Your Supabase project URL' },
            { name: 'SUPABASE_KEY', desc: 'Service role key (secret)' },
            { name: 'REDIS_URL', desc: 'Redis cluster connection string' },
            { name: 'DB_POOL_SIZE', desc: 'Database connection pool size (default: 100)' },
            { name: 'CACHE_TTL', desc: 'Cache time-to-live in seconds (default: 300)' },
            { name: 'RATE_LIMIT_RPS', desc: 'Max requests per second per client' },
            { name: 'JVM_HEAP', desc: 'JVM heap size (default: -Xmx8g)' },
            { name: 'NETTY_THREADS', desc: 'Netty event loop threads (default: CPU cores)' },
          ].map((env, i) => (
            <div key={i} className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50">
              <code className="text-emerald-400 text-sm font-mono">{env.name}</code>
              <span className="text-gray-500 text-xs">— {env.desc}</span>
            </div>
          ))}
        </div>
      </div>

      {/* JVM Tuning */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">JVM Tuning for Maximum Throughput</h3>
        <CodeBlock 
          code={`# JVM Arguments for 1M RPS (per node)
java \\
  -server \\
  -Xms8g -Xmx8g \\
  -XX:+UseZGC \\
  -XX:+ZGenerational \\
  -XX:MaxGCPauseMillis=1 \\
  -XX:+AlwaysPreTouch \\
  -XX:+UseNUMA \\
  -Dio.netty.eventLoop.maxPendingTasks=100000 \\
  -Dreactor.schedulers.defaultBoundedElasticOnVirtualThreads=true \\
  -Dspring.main.web-application-type=reactive \\
  -jar target/high-perf-api-1.0.jar`}
          language="bash" 
        />
      </div>
    </div>
  );
}

function BenchmarkSection({ copyToClipboard, copiedSection }: { copyToClipboard: (text: string, section: string) => void; copiedSection: string | null }) {
  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">Benchmarking & Testing</h2>
        <p className="text-gray-400">Tools and scripts to validate 1M RPS performance</p>
      </div>

      {/* Benchmark Tools */}
      <div className="grid md:grid-cols-3 gap-6">
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">wrk2</h3>
          <p className="text-sm text-gray-400 mb-3">Constant throughput load testing with accurate latency measurement</p>
          <code className="text-xs text-emerald-400 bg-gray-800 px-2 py-1 rounded block">wrk2 -t12 -c400 -d60s -R100000 http://api/health</code>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">vegeta</h3>
          <p className="text-sm text-gray-400 mb-3">HTTP load testing with detailed percentile reporting</p>
          <code className="text-xs text-emerald-400 bg-gray-800 px-2 py-1 rounded block">vegeta attack -rate=1000000 -duration=60s targets.txt</code>
        </div>
        <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Gatling</h3>
          <p className="text-sm text-gray-400 mb-3">Scala-based load testing with beautiful HTML reports</p>
          <code className="text-xs text-emerald-400 bg-gray-800 px-2 py-1 rounded block">gatling.sh -s HighPerfSimulation</code>
        </div>
      </div>

      {/* Benchmark Script */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/50">
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-emerald-400" />
            <span className="text-sm font-medium text-gray-200">benchmark.sh</span>
            <span className="text-xs text-gray-500">- Distributed Load Test Script</span>
          </div>
          <button 
            onClick={() => copyToClipboard(benchmarkScript, 'benchmark')}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gray-800 hover:bg-gray-700 text-xs text-gray-300 transition-colors"
          >
            {copiedSection === 'benchmark' ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            {copiedSection === 'benchmark' ? 'Copied!' : 'Copy'}
          </button>
        </div>
        <CodeBlock code={benchmarkScript} language="bash" />
      </div>

      {/* Expected Results */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Expected Benchmark Results</h3>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-sm font-medium text-emerald-400 mb-3">Per Node (8 vCPU, 16GB)</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Throughput</span>
                <span className="text-white font-mono">~67,000 RPS</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Avg Latency</span>
                <span className="text-white font-mono">0.8ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">p50 Latency</span>
                <span className="text-white font-mono">0.5ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">p99 Latency</span>
                <span className="text-white font-mono">3.2ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">p99.9 Latency</span>
                <span className="text-white font-mono">8.1ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Error Rate</span>
                <span className="text-white font-mono">0.001%</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="text-sm font-medium text-cyan-400 mb-3">Full Cluster (15 nodes)</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Throughput</span>
                <span className="text-white font-mono">1,005,000 RPS</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Avg Latency</span>
                <span className="text-white font-mono">1.2ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">p50 Latency</span>
                <span className="text-white font-mono">0.8ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">p99 Latency</span>
                <span className="text-white font-mono">4.5ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">p99.9 Latency</span>
                <span className="text-white font-mono">12ms</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Error Rate</span>
                <span className="text-white font-mono">0.003%</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Monitoring */}
      <div className="rounded-xl bg-gray-900 border border-gray-800 p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Monitoring Stack</h3>
        <div className="grid md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-gray-800/50 text-center">
            <div className="text-orange-400 font-semibold mb-1">Prometheus</div>
            <div className="text-xs text-gray-500">Metrics collection</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50 text-center">
            <div className="text-yellow-400 font-semibold mb-1">Grafana</div>
            <div className="text-xs text-gray-500">Dashboards & alerts</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50 text-center">
            <div className="text-blue-400 font-semibold mb-1">Jaeger</div>
            <div className="text-xs text-gray-500">Distributed tracing</div>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50 text-center">
            <div className="text-gray-400 font-semibold mb-1">Loki</div>
            <div className="text-xs text-gray-500">Log aggregation</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
