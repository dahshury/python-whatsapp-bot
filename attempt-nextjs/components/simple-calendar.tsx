"use client"

import { useRef, useLayoutEffect } from 'react'
import FullCalendar from '@fullcalendar/react'
import multiMonthPlugin from '@fullcalendar/multimonth'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import listPlugin from '@fullcalendar/list'
import { useLanguage } from '@/lib/language-context'
import arLocale from '@fullcalendar/core/locales/ar'
import { getTimezone } from '@/lib/calendar-config'

export function FullCalendarComponent() {
  const calendarRef = useRef<FullCalendar>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { isRTL } = useLanguage()

  // Resize calendar when container size or language changes
  useLayoutEffect(() => {
    if (!calendarRef.current || !containerRef.current) return
    const calendarApi = calendarRef.current.getApi()
    // Initial sizing
    requestAnimationFrame(() => calendarApi.updateSize())
    // Observe container resize
    const resizeObserver = new ResizeObserver(() => {
      calendarApi.updateSize()
    })
    resizeObserver.observe(containerRef.current)
    return () => {
      resizeObserver.disconnect()
    }
  }, [isRTL])

  return (
    <div ref={containerRef} className="w-full h-full">
      <FullCalendar
        ref={calendarRef}
        plugins={[multiMonthPlugin, dayGridPlugin, timeGridPlugin, listPlugin]}
        initialView="multiMonthYear"
        height="auto"
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'multiMonthYear,dayGridMonth,timeGridWeek,listMonth'
        }}
        // Enhanced calendar options based on Python implementation
        editable={true}
        selectable={true}
        eventStartEditable={true}
        eventDurationEditable={false}
        expandRows={true}
        navLinks={true}
        weekNumbers={false}
        buttonIcons={{
          prev: 'chevron-left',
          next: 'chevron-right'
        }}
        nowIndicator={true}
        slotMinTime="06:00:00"
        slotMaxTime="23:00:00"
        allDaySlot={false}
        slotDuration="02:00:00"
        locale={isRTL ? arLocale : "en"}
        direction={isRTL ? "rtl" : "ltr"}
        firstDay={6} // Saturday as first day
        aspectRatio={1.4}
        multiMonthMaxColumns={3}
        multiMonthMinWidth={350}
        fixedWeekCount={false}
        showNonCurrentDates={false}
        dayMaxEvents={true}
        moreLinkClick="popover"
        eventDisplay="block"
        displayEventTime={false}
        eventClassNames="bg-blue-500 text-white rounded px-1 text-xs"
        dayCellClassNames="hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
        viewClassNames="bg-white dark:bg-gray-900 rounded-lg shadow-sm"
      />
      
      <style jsx global>{`
        .fc-event-past {
          opacity: 0.6;
        }
        .fc-event-time {
          font-style: italic;
        }
        .fc-event-title {
          font-weight: 700;
        }
        .fc-event.conversation-event .fc-event-time {
          display: none;
        }
        .fc-toolbar-title {
          font-size: 2rem;
        }
        /* Change cursor to pointer for all calendar events */
        .fc-event {
          cursor: pointer !important;
        }
                 .fc-scrollgrid {
           border-radius: 16px !important;
           overflow: hidden !important;
         }
         .fc-scrollgrid-section-header > td {
           border-radius: 0 !important;
         }
         .fc-scrollgrid-section-body > td {
           border-radius: 0 !important;
         }
         .fc-col-header-cell {
           border-radius: 0 !important;
         }
         .fc-daygrid-day {
           border-radius: 0 !important;
         }
        .fc .fc-toolbar-title {
          font-size: 1.25rem !important;
          margin: 0;
          font-weight: 500;
          padding: 20px 0 0px 20px;
        }
        .fc .fc-button {
          background-color: #006082 !important;
          border-color: #006082 !important;
        }
        .fc-day-today {
          background-color: #edf5f7 !important;
        }
        [data-theme="dark"] .fc-day-today,
        .dark .fc-day-today {
          background-color: #1e293b !important;
        }
                 .fc-theme-standard td,
         .fc-theme-standard th {
           border: 1px solid #e5e7eb !important;
         }
         .dark .fc-theme-standard td,
         .dark .fc-theme-standard th {
           border: 1px solid #374151 !important;
         }
         .fc-scrollgrid-sync-table {
           border-collapse: separate !important;
           border-spacing: 0 !important;
         }
                 .fc-day-other {
           background: #FAFAFB !important;
         }
         .dark .fc-day-other {
           background: #111827 !important;
         }
         .fc-daygrid-day-frame {
           position: relative !important;
           overflow: hidden !important;
         }
         .fc-daygrid-day-bg {
           position: absolute !important;
           top: 0 !important;
           left: 0 !important;
           right: 0 !important;
           bottom: 0 !important;
         }
        .fc .fc-button .fc-icon {
          font-size: 0.875rem !important;
        }
        a.fc-col-header-cell-cushion {
          font-size: .85em !important;
          line-height: 2.2rem !important;
          font-weight: 600 !important;
        }
        .fc .fc-daygrid-day-top {
          flex-direction: inherit !important;
          padding: 5px !important;
          font-size: .75em !important;
          color: #6b7280 !important;
        }
        .dark .fc .fc-daygrid-day-top {
          color: #9ca3af !important;
        }
        .fc .fc-button-primary:disabled {
          background-color: #eeeeee !important;
          color: black !important;
          border-color: #eeeeee !important;
          font-size: 0.875rem !important;
          line-height: 1.25rem !important;
          text-transform: capitalize !important;
        }
        .dark .fc .fc-button-primary:disabled {
          background-color: #374151 !important;
          color: white !important;
          border-color: #374151 !important;
        }
        /* Dark mode styles for calendar */
        .dark .fc {
          color: #f9fafb;
        }
        .dark .fc-theme-standard th {
          background-color: #374151;
          border-color: #4b5563;
        }
        .dark .fc-theme-standard td {
          background-color: #1f2937;
          border-color: #374151;
        }
        .dark .fc-col-header-cell-cushion {
          color: #f9fafb;
        }
        .dark .fc-daygrid-day-number {
          color: #d1d5db;
        }
        .dark .fc-button-primary {
          background-color: #006082 !important;
          border-color: #006082 !important;
          color: white !important;
        }
                 .dark .fc-button-primary:hover {
           background-color: #004d66 !important;
           border-color: #004d66 !important;
         }
         /* RTL-specific styles */
         .fc[dir="rtl"] .fc-toolbar-title {
           padding: 20px 20px 0px 0 !important;
         }
         .fc[dir="rtl"] .fc-button-group {
           direction: rtl !important;
         }
         .fc[dir="rtl"] .fc-daygrid-day-top {
           direction: rtl !important;
         }
         .fc[dir="rtl"] .fc-col-header-cell-cushion {
           direction: rtl !important;
         }
         .fc[dir="rtl"] .fc-event {
           direction: rtl !important;
         }
         /* Performance optimizations */
         .fc {
           will-change: auto !important;
           transform: translateZ(0) !important;
         }
         .fc-scrollgrid {
           will-change: auto !important;
         }
         .fc-view-harness {
           will-change: auto !important;
         }
       `}</style>
    </div>
  )
} 