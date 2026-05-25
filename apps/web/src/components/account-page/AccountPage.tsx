import { Link } from "@tanstack/react-router"
import { useIsAdmin } from "@/hooks/use-is-admin"
import { UserPreferencesForm } from "@/components/user-preferences-form"
import { Button } from "@/components/ui/button"

export const AccountPage = () => {
  const { isAdmin } = useIsAdmin()

  return (
    <section className="mx-auto max-w-xl">
      <h1 className="font-heading text-2xl font-semibold">Account</h1>

      <div className="mt-6">
        <h2 className="font-heading text-lg font-semibold">Preferences</h2>
        <div className="mt-4">
          <UserPreferencesForm />
        </div>
      </div>

      {isAdmin && (
        <div className="mt-8">
          <h2 className="font-heading text-lg font-semibold">Admin</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Manage the application.
          </p>
          <div className="mt-4">
            <Button
              render={<Link to="/admin" />}
              variant="outline"
              nativeButton={false}
            >
              Go to Admin
            </Button>
          </div>
        </div>
      )}
    </section>
  )
}
