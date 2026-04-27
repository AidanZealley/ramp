import { useEffect, useRef, type PropsWithChildren } from "react"
import { WorkoutEditorStoreContext } from "./context"
import { createWorkoutEditorStore } from "./create-store"
import type { WorkoutEditorStoreProps } from "./types"

export function WorkoutEditorStoreProvider({
  children,
  ...props
}: PropsWithChildren<WorkoutEditorStoreProps>) {
  const storeRef = useRef<ReturnType<typeof createWorkoutEditorStore> | null>(
    null
  )

  if (!storeRef.current) {
    storeRef.current = createWorkoutEditorStore(props)
  }

  useEffect(() => {
    storeRef.current?.getState().actions.syncFromProps(props)
  }, [props.intervals, props.displayMode, props.ftp, props.onIntervalsChange])

  return (
    <WorkoutEditorStoreContext.Provider value={storeRef.current}>
      {children}
    </WorkoutEditorStoreContext.Provider>
  )
}
