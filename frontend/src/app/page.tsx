import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowRight, Cloud, Shield, Zap } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="space-y-8">
      <div className="text-center space-y-4">
        <h1 className="text-4xl font-bold tracking-tight">
          Multi-Provider Application Provisioning
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
          Deploy your applications across AWS, Azure, GCP, Docker, and Kubernetes 
          with a single click. Streamline your deployment process with intelligent 
          configuration management.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <Cloud className="h-8 w-8 text-blue-600" />
            <CardTitle>Multi-Cloud Support</CardTitle>
            <CardDescription>
              Deploy to AWS, Azure, GCP, and more with unified configuration
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Zap className="h-8 w-8 text-yellow-600" />
            <CardTitle>One-Click Deployment</CardTitle>
            <CardDescription>
              Simple wizard-driven interface for complex deployments
            </CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <Shield className="h-8 w-8 text-green-600" />
            <CardTitle>Secure by Default</CardTitle>
            <CardDescription>
              Built-in security best practices and compliance standards
            </CardDescription>
          </CardHeader>
        </Card>
      </div>

      <div className="text-center">
        <Link href="/provision">
          <Button size="lg" className="text-lg px-8 py-6">
            Start Provisioning
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </Link>
      </div>
    </div>
  )
}