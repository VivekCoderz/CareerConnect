import { fireEvent, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { renderWithProviders } from '../../test/renderWithProviders'
import CandidateDashboardShell from './CandidateDashboardShell'

const user = { fullName: 'Asha Verma', email: 'asha@example.com' }

const renderShell = (props = {}) =>
  renderWithProviders(
    <CandidateDashboardShell user={user} activeTab="dashboard" onLogout={() => {}} {...props}>
      <p>Tab content</p>
    </CandidateDashboardShell>,
  )

const sidebar = () => screen.getByRole('complementary')

describe('CandidateDashboardShell (H22)', () => {
  it.each([
    ['student', 'Student Hub', 'Education', '/student/profile'],
    ['fresher', 'Fresher Hub', 'Find Jobs', '/fresher/profile'],
    ['professional', 'Professional Hub', 'Career Growth', '/professional/profile'],
  ])('renders the one sidebar and top bar for a %s', (type, hub, typeItem, profilePath) => {
    renderShell({ type })

    expect(within(sidebar()).getByText(hub)).toBeInTheDocument()
    expect(within(sidebar()).getByText(typeItem)).toBeInTheDocument()
    expect(within(sidebar()).getByRole('link', { name: 'My Profile' })).toHaveAttribute('href', profilePath)
    expect(screen.getByText('Tab content')).toBeInTheDocument()
    expect(screen.getAllByText('Asha Verma').length).toBeGreaterThan(0)
  })

  it('selects a tab through the page handler', () => {
    const onSelectTab = vi.fn()
    renderShell({ type: 'professional', onSelectTab })

    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Applications' }))
    expect(onSelectTab).toHaveBeenCalledWith('applications')

    // Professionals have career & privacy settings as a tab, also in the account menu.
    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Settings' }))
    expect(onSelectTab).toHaveBeenCalledWith('settings')
  })

  it('without a tab handler, a menu item opens the dashboard on that tab', () => {
    renderShell({ type: 'fresher', activeTab: 'recommendations' })

    fireEvent.click(within(sidebar()).getByRole('button', { name: 'Applications' }))
    expect(screen.getByTestId('location')).toHaveTextContent('/fresher/dashboard?tab=applications')
  })

  it('marks the active tab and shows the unread count on Notifications', () => {
    renderShell({ type: 'student', activeTab: 'notifications', unreadNotifications: 3 })

    const notifications = within(sidebar()).getByRole('button', { name: /Notifications/ })
    expect(notifications).toHaveAttribute('aria-current', 'page')
    expect(notifications).toHaveTextContent('3')
  })

  it('signs out from the account menu', () => {
    const onLogout = vi.fn()
    renderShell({ type: 'student', onLogout })

    fireEvent.click(screen.getByRole('button', { name: /Asha Verma/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Sign Out' }))
    expect(onLogout).toHaveBeenCalled()
  })
})
