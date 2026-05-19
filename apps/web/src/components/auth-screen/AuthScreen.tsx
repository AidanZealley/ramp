import * as React from "react"
import { useAuthActions } from "@convex-dev/auth/react"
import { TriangleRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type AuthFlow = "signIn" | "signUp"

export const AuthScreen = () => {
  const { signIn } = useAuthActions()
  const [flow, setFlow] = React.useState<AuthFlow>("signIn")
  const [error, setError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (isSubmitting) {
      return
    }

    setError(null)
    setIsSubmitting(true)

    try {
      const formData = new FormData(event.currentTarget)
      formData.set("flow", flow)
      await signIn("password", formData)
    } catch {
      setError(
        flow === "signIn"
          ? "Could not sign in with those credentials."
          : "Could not create an account with those credentials."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="flex min-h-svh items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex items-center gap-1">
          <TriangleRight className="-mt-1 size-5" strokeWidth={4} />
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Ramp
          </h1>
        </div>

        <div className="mb-6 flex rounded-full bg-muted p-1">
          <Button
            type="button"
            variant={flow === "signIn" ? "secondary" : "ghost"}
            className="flex-1"
            onClick={() => setFlow("signIn")}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={flow === "signUp" ? "secondary" : "ghost"}
            className="flex-1"
            onClick={() => setFlow("signUp")}
          >
            Sign up
          </Button>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <input type="hidden" name="flow" value={flow} />
          <div className="space-y-2">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              name="email"
              type="email"
              autoComplete={flow === "signIn" ? "username" : "email"}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              name="password"
              type="password"
              autoComplete={
                flow === "signIn" ? "current-password" : "new-password"
              }
              required
            />
          </div>

          {error ? (
            <p
              role="status"
              aria-live="polite"
              className="text-sm text-destructive"
            >
              {error}
            </p>
          ) : null}

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting
              ? "Working..."
              : flow === "signIn"
                ? "Sign in"
                : "Create account"}
          </Button>
        </form>
      </div>
    </main>
  )
}
