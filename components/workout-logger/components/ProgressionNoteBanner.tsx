"use client"

interface ProgressionNoteBannerProps {
  week?: number
  day?: number
  note?: string
}

export function ProgressionNoteBanner({ week, day, note }: ProgressionNoteBannerProps) {
  if (!week || week <= 1 || !note) return null

  return (
    <div className="bg-blue-50 border-b border-blue-200 p-3 text-center">
      <p className="text-sm text-blue-900">
        <span className="font-semibold">Week {week}, Day {day || 1}:</span> {note}
      </p>
    </div>
  )
}
