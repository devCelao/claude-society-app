'use client'

import { useState } from 'react'
import { format, parse, isValid } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'

interface Props {
  value: string // yyyy-MM-dd ou vazio
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DatePickerField({ value, onChange, placeholder = 'Selecione uma data', disabled }: Props) {
  const [open, setOpen] = useState(false)

  const date = value ? parse(value, 'yyyy-MM-dd', new Date()) : undefined
  const dateValida = date && isValid(date) ? date : undefined

  function handleSelect(selected: Date | undefined) {
    if (selected) {
      onChange(format(selected, 'yyyy-MM-dd'))
      setOpen(false)
    }
  }

  return (
    <Popover open={open} onOpenChange={disabled ? undefined : setOpen}>
      <PopoverTrigger
        disabled={disabled}
        className="flex items-center gap-2 w-full rounded-xl px-3.5 py-2.5 text-sm font-barlow text-left transition-all focus:outline-none focus:ring-2 focus:ring-gold/20 disabled:opacity-50 disabled:cursor-not-allowed"
        style={{ background: '#0a0a0a', border: '1px solid #242424', color: dateValida ? '#f0ede0' : '#555555' }}
      >
        <CalendarIcon size={15} style={{ color: '#888', flexShrink: 0 }} />
        {dateValida ? format(dateValida, 'dd/MM/yyyy') : placeholder}
      </PopoverTrigger>
      <PopoverContent
        className="w-auto p-0"
        align="start"
        style={{ background: '#111111', border: '1px solid #242424' }}
      >
        <Calendar
          mode="single"
          selected={dateValida}
          onSelect={handleSelect}
          locale={ptBR}
        />
      </PopoverContent>
    </Popover>
  )
}
