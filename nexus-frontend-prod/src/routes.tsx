import { Dashboard } from './pages/Dashboard'
import { NetworkOverview } from './pages/NetworkOverview'
import { Team } from './pages/Team'
import { Tree } from './pages/Tree'
import { Deposits } from './pages/Deposits'
import { Ledger } from './pages/Ledger'
import { Withdrawals } from './pages/Withdrawals'
import Login from './pages/Login'
import { RequireAuth } from './components/RequireAuth'

export const routes = [
  { path: '/login', element: <Login /> },
  { path: '/', element: <RequireAuth><Dashboard /></RequireAuth> },
  { path: '/network/overview', element: <RequireAuth><NetworkOverview /></RequireAuth> },
  { path: '/network/team', element: <RequireAuth><Team /></RequireAuth> },
  { path: '/network/tree', element: <RequireAuth><Tree /></RequireAuth> },
  { path: '/deposits', element: <RequireAuth><Deposits /></RequireAuth> },
  { path: '/ledger', element: <RequireAuth><Ledger /></RequireAuth> },
  { path: '/withdrawals', element: <RequireAuth><Withdrawals /></RequireAuth> },
]
