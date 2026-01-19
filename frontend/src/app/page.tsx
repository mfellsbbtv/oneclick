import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, UserPlus, UserMinus, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          OneClick Account Management
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Provision and terminate user accounts across Google Workspace and Microsoft 365
          with a single click. Streamline your onboarding and offboarding process.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-green-300">
          <Link href="/quick-provision">
            <CardHeader>
              <UserPlus className="h-8 w-8 text-green-600" />
              <CardTitle>User Provisioning</CardTitle>
              <CardDescription>
                Create new user accounts in Google Workspace and Microsoft 365 with automatic license assignment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Create Google Workspace accounts</li>
                <li>Create Microsoft 365 accounts with licenses</li>
                <li>Auto-assign organizational units</li>
                <li>Role-based license selection</li>
              </ul>
            </CardContent>
          </Link>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer border-2 hover:border-red-300">
          <Link href="/terminate">
            <CardHeader>
              <UserMinus className="h-8 w-8 text-red-600" />
              <CardTitle>User Termination</CardTitle>
              <CardDescription>
                Offboard users by disabling accounts, resetting passwords, and notifying managers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>Move to archive organizational unit</li>
                <li>Remove from all groups</li>
                <li>Reset password and sign out</li>
                <li>Set vacation responder</li>
                <li>Email manager with details</li>
              </ul>
            </CardContent>
          </Link>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-yellow-600" />
            <CardTitle>One-Click Operations</CardTitle>
            <CardDescription>
              Simple wizard-driven interface for complex account management
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-blue-600" />
            <CardTitle>Secure by Default</CardTitle>
            <CardDescription>
              Built-in security best practices and audit trails
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="text-center flex justify-center gap-4">
        <Link href="/quick-provision">
          <Button size="lg" className="text-lg px-8 py-6 bg-green-600 hover:bg-green-700">
            <UserPlus className="mr-2 h-5 w-5" />
            Provision User
          </Button>
        </Link>
        <Link href="/terminate">
          <Button size="lg" variant="destructive" className="text-lg px-8 py-6">
            <UserMinus className="mr-2 h-5 w-5" />
            Terminate User
          </Button>
        </Link>
      </div>
    </div>
  )
}