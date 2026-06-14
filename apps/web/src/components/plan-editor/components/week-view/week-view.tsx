import {
  DndContext,
  DragOverlay,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import { useEffect, useState } from "react"
import { DayCard, DayCardDragOverlay } from "./day-card"
import { WeekNav } from "./week-nav"
import { WeekTotalsFooter } from "./week-totals-footer"
import { getDaySlots } from "./utils"
import type { PlanEditorWeek } from "../../types"
import type { DragEndEvent, DragOverEvent, DragStartEvent } from "@dnd-kit/core"
import type { ReactNode } from "react"

interface WeekViewProps {
  week: PlanEditorWeek
  weekNumber: number
  totalWeeks: number
  activeDayIndex: number | null
  children?: ReactNode
  onSelectDay: (dayIndex: number) => void
  onPrevWeek: () => void
  onNextWeek: () => void
  onAddWeek: () => void
  onDeleteWeek: () => void
  onMoveWorkout: (fromDayIndex: number, toDayIndex: number) => void
}

export function WeekView({
  week,
  weekNumber,
  totalWeeks,
  activeDayIndex,
  children,
  onSelectDay,
  onPrevWeek,
  onNextWeek,
  onAddWeek,
  onDeleteWeek,
  onMoveWorkout,
}: WeekViewProps) {
  const daySlots = getDaySlots(week)
  const [activeDragDayIndex, setActiveDragDayIndex] = useState<number | null>(
    null
  )
  const [activeOverDayIndex, setActiveOverDayIndex] = useState<number | null>(
    null
  )
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 6,
      },
    })
  )
  const activeDragSlot =
    activeDragDayIndex === null
      ? null
      : (daySlots.find((slot) => slot.dayIndex === activeDragDayIndex) ?? null)
  const activeOverSlot =
    activeOverDayIndex === null
      ? null
      : (daySlots.find((slot) => slot.dayIndex === activeOverDayIndex) ?? null)

  useEffect(() => {
    if (activeDragDayIndex === null) return
    const previousCursor = document.body.style.cursor
    document.body.style.cursor = "grabbing"
    return () => {
      document.body.style.cursor = previousCursor
    }
  }, [activeDragDayIndex])

  const handleDragStart = (event: DragStartEvent) => {
    const dayIndex = event.active.data.current?.dayIndex
    setActiveDragDayIndex(typeof dayIndex === "number" ? dayIndex : null)
    setActiveOverDayIndex(null)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const dayIndex = event.over?.data.current?.dayIndex
    setActiveOverDayIndex(typeof dayIndex === "number" ? dayIndex : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragDayIndex(null)
    setActiveOverDayIndex(null)
    const fromDayIndex = event.active.data.current?.dayIndex
    const toDayIndex = event.over?.data.current?.dayIndex
    if (
      typeof fromDayIndex !== "number" ||
      typeof toDayIndex !== "number" ||
      fromDayIndex === toDayIndex
    ) {
      return
    }

    onMoveWorkout(fromDayIndex, toDayIndex)
  }

  return (
    <div className="space-y-4">
      <WeekNav
        weekNumber={weekNumber}
        totalWeeks={totalWeeks}
        onPrevWeek={onPrevWeek}
        onNextWeek={onNextWeek}
        onAddWeek={onAddWeek}
        onDeleteWeek={onDeleteWeek}
      />

      {children}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragCancel={() => {
          setActiveDragDayIndex(null)
          setActiveOverDayIndex(null)
        }}
        onDragEnd={handleDragEnd}
      >
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
          {daySlots.map((slot) => (
            <DayCard
              key={slot.dayIndex}
              slot={slot}
              previewSlot={
                activeDragDayIndex === slot.dayIndex &&
                activeOverSlot?.workout &&
                activeOverSlot.dayIndex !== slot.dayIndex
                  ? activeOverSlot
                  : null
              }
              active={activeDayIndex === slot.dayIndex}
              onClick={() => onSelectDay(slot.dayIndex)}
            />
          ))}
        </div>

        <DragOverlay dropAnimation={null}>
          {activeDragSlot ? <DayCardDragOverlay slot={activeDragSlot} /> : null}
        </DragOverlay>
      </DndContext>

      <WeekTotalsFooter week={week} activeDayIndex={activeDayIndex} />
    </div>
  )
}
