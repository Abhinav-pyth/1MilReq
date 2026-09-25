export function ArchitectureDiagram() {
  return (
    <div className="rounded-xl bg-gray-900 border border-gray-800 p-6 md:p-8 overflow-x-auto">
      <div className="min-w-[700px]">
        {/* Client Layer */}
        <div className="flex justify-center mb-6">
          <div className="px-6 py-3 rounded-lg bg-blue-500/10 border border-blue-500/30 text-blue-400 text-sm font-medium text-center">
            🌐 Clients (Browsers, Mobile Apps, IoT Devices)
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center mb-2">
          <div className="w-0.5 h-6 bg-gray-600"></div>
        </div>

        {/* CDN / Edge */}
        <div className="flex justify-center mb-6">
          <div className="px-6 py-3 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-sm font-medium text-center">
            ⚡ CDN Edge (Cloudflare / Fastly) — Static Content + DDoS Protection
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center mb-2">
          <div className="w-0.5 h-6 bg-gray-600"></div>
        </div>

        {/* Load Balancer */}
        <div className="flex justify-center mb-6">
          <div className="px-6 py-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm font-medium text-center">
            🔀 NGINX Load Balancer (4 instances) — Rate Limiting + SSL Termination
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center mb-2">
          <div className="w-0.5 h-6 bg-gray-600"></div>
        </div>

        {/* Application Layer */}
        <div className="mb-6">
          <div className="text-center text-xs text-gray-500 mb-2 uppercase tracking-wider">Kubernetes Cluster — Auto-scaling (15+ pods)</div>
          <div className="grid grid-cols-5 gap-2 max-w-2xl mx-auto">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-medium text-center">
                Java Pod {i + 1}
                <div className="text-[10px] text-emerald-400/60 mt-0.5">WebFlux + Netty</div>
              </div>
            ))}
            <div className="px-3 py-2 rounded-lg bg-gray-800 border border-gray-700 text-gray-500 text-xs font-medium text-center flex items-center justify-center">
              +10 more...
            </div>
          </div>
        </div>

        {/* Arrow */}
        <div className="flex justify-center mb-2">
          <div className="w-0.5 h-6 bg-gray-600"></div>
        </div>

        {/* Cache + DB Layer */}
        <div className="grid grid-cols-2 gap-6 max-w-2xl mx-auto">
          <div className="px-4 py-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm font-medium text-center">
            🔴 Redis Cluster (6 nodes)
            <div className="text-xs text-rose-400/60 mt-1">L2 Cache — Hot Data</div>
          </div>
          <div className="px-4 py-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm font-medium text-center">
            🟢 Supabase (PostgreSQL)
            <div className="text-xs text-emerald-400/60 mt-1">Primary DB + Read Replicas</div>
          </div>
        </div>

        {/* Arrow from pods to cache/db */}
        <div className="flex justify-center mt-4 mb-2">
          <div className="text-xs text-gray-500">
            ↕ R2DBC (Reactive DB Client) + Lettuce (Redis) + Caffeine (L1 Cache)
          </div>
        </div>
      </div>
    </div>
  );
}
