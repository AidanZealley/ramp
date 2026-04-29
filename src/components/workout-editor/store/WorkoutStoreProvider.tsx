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
    storeRef.current?.getState().actions.receiveServerSnapshot({
      intervals: props.serverIntervals,
      resetKey: props.serverResetKey,
      intervalsRevision: props.serverIntervalsRevision,
    })
  }, [
    props.serverIntervals,
    props.serverIntervalsRevision,
    props.serverResetKey,
  ])

  useEffect(() => {
    storeRef.current?.getState().actions.syncExternalConfig({
      displayMode: props.displayMode,
      ftp: props.ftp,
    })
  }, [props.displayMode, props.ftp])

  return (
    <WorkoutEditorStoreContext.Provider value={storeRef.current}>
      {children}
    </WorkoutEditorStoreContext.Provider>
  )
}
