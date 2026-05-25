import { useState } from "react"
import { Link } from "@tanstack/react-router"
import { useAuthActions } from "@convex-dev/auth/react"
import { useQuery } from "convex/react"
import { api } from "#convex/_generated/api"
import { useIsAdmin } from "@/hooks/use-is-admin"
import { PreferencesDialog } from "@/components/preferences-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export const AccountDropdown = () => {
  const [preferencesOpen, setPreferencesOpen] = useState(false)
  const currentUser = useQuery(api.auth.currentUser)
  const { signOut } = useAuthActions()
  const { isAdmin } = useIsAdmin()

  const fallbackChar = (currentUser?.email ?? currentUser?.name ?? "U")
    .charAt(0)
    .toUpperCase()

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Avatar className="size-8 cursor-pointer transition-opacity hover:opacity-80" />
          }
          nativeButton={false}
        >
          <AvatarFallback className="text-xs font-medium">
            {fallbackChar}
          </AvatarFallback>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem render={<Link to="/account" />}>
            Account
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setPreferencesOpen(true)}>
            Preferences
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => void signOut()}>
            Sign Out
          </DropdownMenuItem>
          {isAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                render={<Link to="/admin" />}
                nativeButton={false}
              >
                Admin
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
      <PreferencesDialog
        open={preferencesOpen}
        onOpenChange={setPreferencesOpen}
      />
    </>
  )
}
