import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Code2, GitPullRequest, Clock } from "lucide-react";

export default async function DashboardPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // TODO: Fetch actual stats from database
  const stats = {
    totalReviews: 0,
    totalPrompts: 0,
    recentActivity: [] as any[],
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome back, {session.user?.name || session.user?.githubId}!</h1>
        <p className="text-muted-foreground mt-1">
          Get AI-powered insights on your GitHub repositories
        </p>
      </div>

      {/* Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <StatCard
          icon={Code2}
          label="Total Reviews"
          value={stats.totalReviews}
        />
        <StatCard
          icon={GitPullRequest}
          label="Code Changes"
          value={stats.totalPrompts}
        />
        <StatCard
          icon={Clock}
          label="Recent Activity"
          value={stats.recentActivity.length}
        />
      </div>

      {/* Quick Actions */}
      <div className="bg-card border rounded-xl p-6">
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid md:grid-cols-2 gap-4">
          <Link
            href="/dashboard/new-review"
            className="p-4 border rounded-lg hover:bg-muted transition-colors"
          >
            <h3 className="font-medium">New Code Review</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Get constructive feedback on a GitHub repository
            </p>
          </Link>
          <Link
            href="/dashboard/reviews"
            className="p-4 border rounded-lg hover:bg-muted transition-colors"
          >
            <h3 className="font-medium">View Past Reviews</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Browse your previous code reviews
            </p>
          </Link>
        </div>
      </div>

      {/* Empty State */}
      {stats.totalReviews === 0 && (
        <div className="bg-muted/50 border rounded-xl p-8 text-center">
          <Code2 className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No reviews yet</h3>
          <p className="text-muted-foreground mt-1 mb-4">
            Start by reviewing your first repository
          </p>
          <Link
            href="/dashboard/new-review"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Code2 className="w-4 h-4" />
            Start Review
          </Link>
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: number;
}) {
  return (
    <div className="bg-card border rounded-xl p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-muted-foreground" />
      </div>
    </div>
  );
}
