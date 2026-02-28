import { AdminLayout } from '../components/layout/AdminLayout'
import { RankManagement } from '../components/RankManagement'

export default function Ranks() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Rank Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            View rank distribution, ecosystem statistics, and manually upgrade user ranks.
          </p>
        </div>
        <RankManagement />
      </div>
    </AdminLayout>
  )
}
