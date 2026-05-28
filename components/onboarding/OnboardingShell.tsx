import StepBar from '@/components/shared/StepBar'

interface Props {
  step: number
  title: string
  subtitle: string
  children: React.ReactNode
}

export default function OnboardingShell({ step, title, subtitle, children }: Props) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="mb-4">
            <StepBar steps="onboarding" current={step} />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
          <p className="text-slate-500 text-sm mt-1">{subtitle}</p>
        </div>
        {children}
      </div>
    </div>
  )
}
