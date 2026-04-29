import type { PropsWithChildren } from "react"
import type {WorkoutEditorStoreProps} from "@/components/workout-editor/store";
import {
  
  WorkoutEditorStoreProvider
} from "@/components/workout-editor/store"

export function WorkoutEditorSessionProvider({
  children,
  ...props
}: PropsWithChildren<WorkoutEditorStoreProps>) {
  return <WorkoutEditorStoreProvider {...props}>{children}</WorkoutEditorStoreProvider>
}
