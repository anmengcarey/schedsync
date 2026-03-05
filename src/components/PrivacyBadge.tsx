import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PrivacyBadgeProps {
  className?: string
  variant?: 'inline' | 'banner'
}

export function PrivacyBadge({ className, variant = 'inline' }: PrivacyBadgeProps) {
  if (variant === 'banner') {
    return (
      <div className={cn('flex items-start gap-3 bg-teal-50 border border-teal-200 rounded-lg p-4', className)}>
        <Shield className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-sm font-medium text-teal-800">Privacy Protected</p>
          <p className="text-xs text-teal-700 mt-0.5">
            We only access free/busy time blocks — never your event titles, locations, attendees, or notes.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-1.5 text-xs text-teal-700', className)}>
      <Shield className="w-3.5 h-3.5" />
      <span>Free/busy only — never event details</span>
    </div>
  )
}
