import { Badge } from '@/components/ui/badge'
import { RequestStatus, ParticipantStatus } from '@/types'
import { cn } from '@/lib/utils'

const requestStatusConfig: Record<RequestStatus, { label: string; className: string }> = {
  draft:     { label: 'Draft',     className: 'bg-gray-100 text-gray-600' },
  active:    { label: 'Active',    className: 'bg-blue-100 text-blue-700' },
  confirmed: { label: 'Confirmed', className: 'bg-teal-100 text-teal-700' },
  expired:   { label: 'Expired',   className: 'bg-orange-100 text-orange-700' },
  cancelled: { label: 'Cancelled', className: 'bg-red-100 text-red-600' },
}

const participantStatusConfig: Record<ParticipantStatus, { label: string; className: string }> = {
  invited:                { label: 'Invited',    className: 'bg-yellow-100 text-yellow-700' },
  availability_submitted: { label: 'Responded',  className: 'bg-teal-100 text-teal-700' },
  declined:               { label: 'Declined',   className: 'bg-red-100 text-red-600' },
}

export function RequestStatusBadge({ status }: { status: RequestStatus }) {
  const { label, className } = requestStatusConfig[status]
  return (
    <Badge variant="outline" className={cn('text-xs font-medium border-0', className)}>
      {label}
    </Badge>
  )
}

export function ParticipantStatusBadge({ status }: { status: ParticipantStatus }) {
  const { label, className } = participantStatusConfig[status]
  return (
    <Badge variant="outline" className={cn('text-xs font-medium border-0', className)}>
      {label}
    </Badge>
  )
}
