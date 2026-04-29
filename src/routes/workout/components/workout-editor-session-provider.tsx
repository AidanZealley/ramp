import type { PropsWithChildren } from "react"
import {
  WorkoutEditorStoreProvider,
  type WorkoutEditorStoreProps,
} from "@/components/workout-editor/store"

export function WorkoutEditorSessionProvider({
  children,
  ...props
}: PropsWithChildren<WorkoutEditorStoreProps>) {
  return <WorkoutEditorStoreProvider {...props}>{children}</WorkoutEditorStoreProvider>
}
