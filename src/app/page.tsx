import Link from "next/link";
import { isAuthenticated } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Code2, GitPullRequest, Shield, Zap } from "lucide-react";
import { GitHubIcon } from "@/components/ui/github-icon";

export default async function Home() {
  const authenticated = await isAuthenticated();
  if (authenticated) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">AI Code Reviewer</h1>
          <Link
            href="/login"
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1">
        <section className="py-20 px-4">
          <div className="container mx-auto max-w-4xl text-center">
            <h2 className="text-5xl font-bold tracking-tight mb-6">
              AI-Powered Code Reviews
              <span className="block text-primary">for GitHub</span>
            </h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Get constructive criticism, identify issues, and request AI-assisted
              changes to your repositories. Submit PRs or commits directly.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-lg font-medium"
            >
              Get Started Free
            </Link>
          </div>
        </section>

        {/* Features */}
        <section className="py-16 px-4 bg-muted/50">
          <div className="container mx-auto max-w-5xl">
            <h3 className="text-3xl font-bold text-center mb-12">
              How It Works
            </h3>
            <div className="grid md:grid-cols-3 gap-8">
              <FeatureCard
                icon={Code2}
                title="Submit Repository"
                description="Paste your GitHub repository URL and our AI analyzes your codebase"
              />
              <FeatureCard
                icon={Shield}
                title="Get Insights"
                description="Receive constructive feedback on code quality, security, and best practices"
              />
              <FeatureCard
                icon={GitPullRequest}
                title="Request Changes"
                description="Ask the AI to make changes and submit PRs or commits directly"
              />
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-16 px-4">
          <div className="container mx-auto max-w-4xl">
            <h3 className="text-3xl font-bold text-center mb-12">
              Why Use AI Code Reviewer?
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              <BenefitItem
                icon={Zap}
                title="Fast Feedback"
                description="Get instant code reviews without waiting for human reviewers"
              />
              <BenefitItem
                icon={Shield}
                title="Catch Issues Early"
                description="Identify potential bugs, security vulnerabilities, and code smells"
              />
              <BenefitItem
                icon={Code2}
                title="Learn & Improve"
                description="Understand best practices and improve your coding skills"
              />
              <BenefitItem
                icon={GitPullRequest}
                title="Automate Changes"
                description="Request fixes and improvements submitted directly to your repo"
              />
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t py-8 px-4">
        <div className="container mx-auto text-center text-sm text-muted-foreground">
          <p>Built with Next.js, OpenAI, and GitHub API</p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="bg-card border rounded-xl p-6 text-center">
      <Icon className="w-12 h-12 mx-auto mb-4 text-primary" />
      <h4 className="text-xl font-semibold mb-2">{title}</h4>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function BenefitItem({
  icon: Icon,
  title,
  description,
}: {
  icon: any;
  title: string;
  description: string;
}) {
  return (
    <div className="flex gap-4 items-start">
      <Icon className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
      <div>
        <h4 className="font-semibold">{title}</h4>
        <p className="text-muted-foreground text-sm">{description}</p>
      </div>
    </div>
  );
}
