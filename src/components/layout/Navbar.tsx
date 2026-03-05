import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { CalendarDays, LogOut, Settings, LayoutDashboard } from 'lucide-react'
import { getInitials } from '@/lib/utils'
import { toast } from 'sonner'

export function Navbar() {
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const isLanding = location.pathname === '/'

  async function handleSignOut() {
    await signOut()
    navigate('/')
    toast.success('Signed out successfully')
  }

  return (
    <nav className="border-b bg-white/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to={user ? '/dashboard' : '/'} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center">
              <CalendarDays className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl text-gray-900">
              Sched<span className="text-teal-600">Sync</span>
            </span>
          </Link>

          {/* Right side */}
          <div className="flex items-center gap-3">
            {user && profile ? (
              <>
                <Link to="/dashboard">
                  <Button variant="ghost" size="sm" className="hidden sm:flex items-center gap-2">
                    <LayoutDashboard className="w-4 h-4" />
                    Dashboard
                  </Button>
                </Link>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="flex items-center gap-2 rounded-full focus:outline-none focus:ring-2 focus:ring-teal-500">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback className="bg-teal-100 text-teal-700 text-sm font-semibold">
                          {getInitials(profile.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden sm:block text-sm font-medium text-gray-700">
                        {profile.name.split(' ')[0]}
                      </span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <div className="px-2 py-1.5">
                      <p className="text-sm font-medium text-gray-900">{profile.name}</p>
                      <p className="text-xs text-gray-500 truncate">{profile.email}</p>
                    </div>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => navigate('/settings')}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="text-red-600">
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              !isLanding && (
                <Link to="/auth">
                  <Button size="sm" className="bg-teal-600 hover:bg-teal-700 text-white">
                    Sign in
                  </Button>
                </Link>
              )
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
