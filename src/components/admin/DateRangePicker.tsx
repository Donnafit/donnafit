"use client"
import { useState } from "react"
import type { DateRange } from "react-day-picker"
import { ptBR } from "date-fns/locale"
import { CalendarIcon } from "lucide-react"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function toDayKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function parseLocalDate(key: string): Date {
  const [y, m, d] = key.split("-").map(Number)
  return new Date(y, m - 1, d)
}

function formatDisplay(date: Date): string {
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
}

interface DateRangePickerProps {
  from: string
  to: string
  onChange: (range: { from: string; to: string }) => void
}

export function DateRangePicker({ from, to, onChange }: DateRangePickerProps) {
  const [open, setOpen] = useState(false)

  const selected: DateRange | undefined = from
    ? { from: parseLocalDate(from), to: to ? parseLocalDate(to) : undefined }
    : undefined

  function handleSelect(range: DateRange | undefined) {
    onChange({
      from: range?.from ? toDayKey(range.from) : "",
      to: range?.to ? toDayKey(range.to) : "",
    })
    if (range?.from && range?.to) setOpen(false)
  }

  const label =
    selected?.from && selected?.to
      ? `${formatDisplay(selected.from)} – ${formatDisplay(selected.to)}`
      : "Selecionar período"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          data-testid="date-range-trigger"
          className={cn(
            "justify-start text-left font-normal text-sm gap-2 font-ui h-9",
            !selected?.from && "text-gray-400"
          )}
        >
          <CalendarIcon className="h-4 w-4" />
          {label}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" data-testid="date-range-calendar">
        <Calendar
          mode="range"
          selected={selected}
          onSelect={handleSelect}
          numberOfMonths={1}
          locale={ptBR}
          disabled={{ after: new Date() }}
          className="rounded-md"
        />
      </PopoverContent>
    </Popover>
  )
}
