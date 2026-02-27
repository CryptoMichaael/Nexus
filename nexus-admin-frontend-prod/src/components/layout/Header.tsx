import { useNavigate } from 'react-router-dom'
import { logout } from '../../lib/auth'
import WalletLoginButton from '../auth/WalletLoginButton'

interface HeaderProps {
  onMenuClick?: () => void
}

export function Header({ onMenuClick }: HeaderProps) {
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <header className="bg-white border-b p-2 flex items-center">
      <button className="p-2 md:hidden" onClick={onMenuClick}>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className="h-6 w-6"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      <div className="ml-auto flex items-center gap-4">
        <WalletLoginButton />
        <button
          onClick={handleLogout}
          className="px-3 py-2 rounded-lg bg-red-500 text-white text-sm hover:bg-red-600"
        >
          Logout
        </button>
      </div>
    </header>
  )
}
