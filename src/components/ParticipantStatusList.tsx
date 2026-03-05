import { RequestParticipant } from '@/types'
import { ParticipantStatusBadge } from '@/components/StatusBadge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { getInitials } from '@/lib/utils'

interface ParticipantStatusListProps {
  participants: RequestParticipant[]
  showRole?: boolean
}

export function ParticipantStatusList({ participants, showRole = false }: ParticipantStatusListProps) {
  return (
    <div className="space-y-2">
      {participants.map((p) => (
        <div key={p.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
          <div className="flex items-center gap-3">
            <Avatar className="w-8 h-8">
              <AvatarFallback className="bg-gray-100 text-gray-600 text-xs font-medium">
                {getInitials(p.name || p.email)}
              </AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium text-gray-900">{p.name || p.email}</p>
              {p.name && <p className="text-xs text-gray-500">{p.email}</p>}
              {showRole && p.role === 'organizer' && (
                <p className="text-xs text-teal-600">Organizer</p>
              )}
            </div>
          </div>
          <ParticipantStatusBadge status={p.status} />
        </div>
      ))}
    </div>
  )
}
