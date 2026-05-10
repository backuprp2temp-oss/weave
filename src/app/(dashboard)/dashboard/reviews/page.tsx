import { getCurrentSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { Code2, ArrowLeft } from "lucide-react";

export default async function ReviewsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/login");
  }

  // TODO: Fetch actual reviews from database
  const reviews: any[] = [];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>

      <div>
        <h1 className="text-3xl font-bold">Code Reviews</h1>
        <p className="text-muted-foreground mt-1">
          View your past code reviews and insights
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="bg-muted/50 border rounded-xl p-12 text-center">
          <Code2 className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
          <h3 className="text-xl font-semibold mb-2">No reviews yet</h3>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">
            You haven't run any code reviews yet. Start by reviewing your first
            repository!
          </p>
          <Link
            href="/dashboard/new-review"
            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Code2 className="w-4 h-4" />
            Start Your First Review
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Placeholder for review cards - will be implemented in Phase 5 */}
          {reviews.map((review) => (
            <div
              key={review.id}
              className="bg-card border rounded-xl p-6 hover:shadow-md transition-shadow"
            >
              <h3 className="font-semibold">{review.repoName}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {review.createdAt}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
