function AuthShell({ title, subtitle, children }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10">
      <div className="absolute -left-24 top-12 h-72 w-72 rounded-full bg-teal-400/15 blur-3xl" />
      <div className="absolute -bottom-16 right-0 h-72 w-72 rounded-full bg-indigo-400/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12)_0,transparent_45%),radial-gradient(circle_at_80%_80%,rgba(255,255,255,0.08)_0,transparent_35%)]" />

      <div className="relative w-full max-w-md rounded-3xl border border-white/20 bg-white/95 p-8 shadow-2xl backdrop-blur">
        <div className="mb-6">
          <p className="font-display text-sm uppercase tracking-[0.18em] text-teal-700">Charity Subscription Platform</p>
          <h1 className="mt-2 font-display text-3xl text-slate-900">{title}</h1>
          <p className="mt-2 text-sm text-slate-600">{subtitle}</p>
        </div>

        {children}
      </div>
    </div>
  )
}

export default AuthShell
