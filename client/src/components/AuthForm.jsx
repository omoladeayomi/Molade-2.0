import Orb from './Orb'

// Shared layout and inputs for the login and register pages:
// the product story on the left (desktop only), the form on the right

export function AuthCard({ title, subtitle, children }) {
  return (
    <div className="flex min-h-screen">
      <section className="hidden flex-1 flex-col justify-between gap-12 border-r border-border bg-sidebar px-16 py-12 lg:flex">
        <div className="flex items-center gap-2.5">
          <Orb size={30} />
          <span className="text-lg font-bold tracking-tight">Molade</span>
        </div>

        <div className="flex max-w-lg flex-col gap-7">
          <h1 className="text-[56px] font-semibold leading-[1.04] tracking-[-0.035em]">Know what to do next.</h1>
          <p className="max-w-[44ch] text-lg leading-relaxed text-[#a3afc2]">
            Molade turns your deadlines into a plan, then talks you through it. Ask out loud what to work on, and get
            an answer with a reason.
          </p>

          <div className="flex max-w-md items-start gap-3.5 rounded-2xl border border-border-blue bg-card p-4.5">
            <Orb size={32} rings={1} />
            <div className="flex min-w-0 flex-col gap-1.5">
              <span className="text-[11px] font-semibold uppercase tracking-widest text-primary">Example · Do this now</span>
              <p className="text-[15px]">Start with your reading. It&apos;s due tomorrow and takes about two hours.</p>
              <span className="font-mono text-xs text-muted">Reading · ~2h · Due tomorrow</span>
            </div>
          </div>
        </div>

        <span className="text-sm text-subtle">An AI study planner for university students</span>
      </section>

      <main className="flex flex-1 items-center justify-center px-6 py-12">
        <div className="flex w-full max-w-sm flex-col gap-6">
          <div className="flex items-center gap-2.5 lg:hidden">
            <Orb size={28} />
            <span className="text-lg font-bold tracking-tight">Molade</span>
          </div>
          <div className="flex flex-col gap-1.5">
            <h2 className="text-[26px] font-semibold tracking-tight">{title}</h2>
            <p className="text-muted">{subtitle}</p>
          </div>
          {children}
        </div>
      </main>
    </div>
  )
}

export const inputClass =
  'h-11.5 rounded-xl border border-border-strong bg-surface px-3.5 text-[15px] text-text outline-none transition focus:border-primary focus:ring-3 focus:ring-primary/20'

export function Field({ label, id, ...inputProps }) {
  return (
    <label htmlFor={id} className="flex flex-col gap-1.5 text-sm font-medium text-[#b4c0d2]">
      {label}
      <input id={id} className={inputClass} {...inputProps} />
    </label>
  )
}

export function ErrorBox({ message }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-xl border border-overdue/30 bg-overdue/10 px-3.5 py-2.5 text-sm text-overdue">
      {message}
    </p>
  )
}

export function SubmitButton({ busy, children }) {
  return (
    <button
      type="submit"
      disabled={busy}
      className="h-12 rounded-xl bg-primary text-[15px] font-semibold text-white transition hover:bg-primary-hover disabled:opacity-60"
    >
      {busy ? 'Please wait...' : children}
    </button>
  )
}
