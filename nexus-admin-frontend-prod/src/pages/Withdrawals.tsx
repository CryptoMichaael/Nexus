import { AdminLayout } from '../components/layout/AdminLayout'
import { WithdrawalManagement } from '../components/WithdrawalManagement'

export default function Withdrawals() {
  return (
    <AdminLayout>
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Withdrawal Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Monitor and manage user withdrawal requests. Override addresses when necessary.
          </p>
        </div>
        <WithdrawalManagement />
      </div>
    </AdminLayout>
  )
}
