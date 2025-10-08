import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { userEvent } from '@testing-library/user-event'
import { WorkoutHeader } from '@/components/workout-logger/components/WorkoutHeader'
import { ConnectionStatusBanner } from '@/components/workout-logger/components/ConnectionStatusBanner'
import { WeekAccessBanner } from '@/components/workout-logger/components/WeekAccessBanner'
import { ProgressionNoteBanner } from '@/components/workout-logger/components/ProgressionNoteBanner'
import type { ConnectionStatus } from '@/components/workout-logger/hooks/use-connection-status'

describe('Workout Logger Components', () => {
  describe('WorkoutHeader', () => {
    const defaultProps = {
      programName: 'Full Body Strength',
      workoutName: 'Full Body A',
      week: 1,
      day: 1,
      progress: 45,
      showCalendar: false,
      onToggleCalendar: vi.fn(),
      onOpenNotes: vi.fn(),
      onOpenSummary: vi.fn(),
      onOpenAddExercise: vi.fn(),
      onOpenEndWorkout: vi.fn(),
      onOpenEndProgram: vi.fn(),
      connectionStatus: 'online' as ConnectionStatus,
    }

    it('should render program name and workout name', () => {
      render(<WorkoutHeader {...defaultProps} />)

      expect(screen.getByText('Full Body Strength')).toBeInTheDocument()
      expect(screen.getByText('Full Body A')).toBeInTheDocument()
    })

    it('should render week and day information', () => {
      render(<WorkoutHeader {...defaultProps} />)

      expect(screen.getByText('Week 1')).toBeInTheDocument()
      expect(screen.getByText('Day 1')).toBeInTheDocument()
    })

    it('should render progress bar', () => {
      const { container } = render(<WorkoutHeader {...defaultProps} />)

      // Progress component renders with specific value
      const progressElement = container.querySelector('[role="progressbar"]')
      expect(progressElement).toBeInTheDocument()
    })

    it('should call onToggleCalendar when calendar button clicked', async () => {
      const user = userEvent.setup()
      const onToggleCalendar = vi.fn()

      render(<WorkoutHeader {...defaultProps} onToggleCalendar={onToggleCalendar} />)

      const calendarButton = screen.getAllByRole('button')[0] // First button is calendar toggle
      await user.click(calendarButton)

      expect(onToggleCalendar).toHaveBeenCalledTimes(1)
    })

    it('should highlight calendar button when showCalendar is true', () => {
      const { rerender } = render(<WorkoutHeader {...defaultProps} showCalendar={false} />)

      let calendarButton = screen.getAllByRole('button')[0]
      expect(calendarButton).not.toHaveClass('bg-muted')

      rerender(<WorkoutHeader {...defaultProps} showCalendar={true} />)

      calendarButton = screen.getAllByRole('button')[0]
      expect(calendarButton).toHaveClass('bg-muted')
    })

    it('should render dropdown menu items', async () => {
      const user = userEvent.setup()
      render(<WorkoutHeader {...defaultProps} />)

      const menuTrigger = screen.getAllByRole('button')[1] // Second button is menu trigger
      await user.click(menuTrigger)

      expect(screen.getByText('Workout Notes')).toBeInTheDocument()
      expect(screen.getByText('Summary')).toBeInTheDocument()
      expect(screen.getByText('Add Exercise')).toBeInTheDocument()
      expect(screen.getByText('End Workout')).toBeInTheDocument()
      expect(screen.getByText('End Program')).toBeInTheDocument()
    })

    it('should call callbacks when menu items clicked', async () => {
      const user = userEvent.setup()
      const callbacks = {
        onOpenNotes: vi.fn(),
        onOpenSummary: vi.fn(),
        onOpenAddExercise: vi.fn(),
        onOpenEndWorkout: vi.fn(),
        onOpenEndProgram: vi.fn(),
      }

      render(<WorkoutHeader {...defaultProps} {...callbacks} />)

      const menuTrigger = screen.getAllByRole('button')[1]
      await user.click(menuTrigger)

      await user.click(screen.getByText('Workout Notes'))
      expect(callbacks.onOpenNotes).toHaveBeenCalledTimes(1)

      await user.click(menuTrigger)
      await user.click(screen.getByText('Summary'))
      expect(callbacks.onOpenSummary).toHaveBeenCalledTimes(1)

      await user.click(menuTrigger)
      await user.click(screen.getByText('Add Exercise'))
      expect(callbacks.onOpenAddExercise).toHaveBeenCalledTimes(1)
    })
  })

  describe('ConnectionStatusBanner', () => {
    it('should render offline banner when status is offline', () => {
      render(<ConnectionStatusBanner status="offline" />)

      expect(screen.getByText(/offline - reconnect to log sets/i)).toBeInTheDocument()
    })

    it('should render syncing banner when status is syncing', () => {
      render(<ConnectionStatusBanner status="syncing" />)

      expect(screen.getByText(/logging set/i)).toBeInTheDocument()
    })

    it('should not render when status is online', () => {
      const { container } = render(<ConnectionStatusBanner status="online" />)

      expect(container.firstChild).toBeNull()
    })

    it('should render error banner when status is error', () => {
      render(<ConnectionStatusBanner status="error" />)

      expect(screen.getByText(/sync error - please try again/i)).toBeInTheDocument()
    })
  })

  describe('WeekAccessBanner', () => {
    it('should render warning banner when blocked but not fully blocked', () => {
      render(<WeekAccessBanner isBlocked={true} isFullyBlocked={false} message="Complete previous week first" />)

      expect(screen.getByText('Complete previous week first')).toBeInTheDocument()
    })

    it('should render error banner when fully blocked', () => {
      render(<WeekAccessBanner isBlocked={true} isFullyBlocked={true} message="Access denied" />)

      expect(screen.getByText('Access denied')).toBeInTheDocument()
    })

    it('should not render when not blocked', () => {
      const { container } = render(<WeekAccessBanner isBlocked={false} isFullyBlocked={false} message="" />)

      expect(container.firstChild).toBeNull()
    })
  })

  describe('ProgressionNoteBanner', () => {
    it('should render note with week and day information', () => {
      render(<ProgressionNoteBanner week={2} day={3} note="Increase weight by 5lbs" />)

      expect(screen.getByText(/week 2, day 3:/i)).toBeInTheDocument()
      expect(screen.getByText(/increase weight by 5lbs/i)).toBeInTheDocument()
    })

    it('should not render when week is 1 or less', () => {
      const { container } = render(<ProgressionNoteBanner week={1} day={1} note="Test note" />)

      expect(container.firstChild).toBeNull()
    })

    it('should not render when note is empty', () => {
      const { container } = render(<ProgressionNoteBanner week={2} day={1} note="" />)

      expect(container.firstChild).toBeNull()
    })
  })
})
