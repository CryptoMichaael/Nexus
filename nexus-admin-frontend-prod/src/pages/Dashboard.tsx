import { AdminLayout } from '../components/layout/AdminLayout'

export default function Dashboard() {
  return (
    <AdminLayout>
      <div className="p-4">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <p>Welcome to the admin interface.</p>
      </div>
    </AdminLayout>
  )
}
