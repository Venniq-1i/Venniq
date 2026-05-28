const ONBOARDING_STEPS = [
  { n: 1, label: 'Firm Details' },
  { n: 2, label: 'Departments' },
  { n: 3, label: 'Capabilities' },
  { n: 4, label: 'Contract Filters' },
  { n: 5, label: 'Contract Types' },
  { n: 6, label: 'Dept Leads' },
  { n: 7, label: 'Employees' },
  { n: 8, label: 'Sources' },
  { n: 9, label: 'Notifications' },
]

const APP_STEPS = [
  { n: 1, label: 'Contracts' },
  { n: 2, label: 'AI Matching' },
  { n: 3, label: 'Reports' },
  { n: 4, label: 'Dashboard' },
]

interface Props {
  steps?: 'onboarding' | 'app'
  current: number
}

export default function StepBar({ steps = 'app', current }: Props) {
  const list = steps === 'onboarding' ? ONBOARDING_STEPS : APP_STEPS

  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {list.map((step, i) => {
        const done = step.n < current
        const active = step.n === current
        return (
          <div key={step.n} className="flex items-center">
            {i > 0 && (
              <div className={`h-px w-6 sm:w-10 ${done ? 'bg-indigo-500' : 'bg-slate-200'}`} />
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  done
                    ? 'bg-indigo-600 text-white'
                    : active
                    ? 'bg-white border-2 border-indigo-600 text-indigo-600'
                    : 'bg-white border-2 border-slate-200 text-slate-400'
                }`}
              >
                {done ? '✓' : step.n}
              </div>
              <span className={`text-xs whitespace-nowrap hidden sm:block ${active ? 'text-indigo-600 font-medium' : 'text-slate-400'}`}>
                {step.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
