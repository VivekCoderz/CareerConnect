import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import authReducer from '../../redux/features/authSlice'
import GoogleOnboarding from './GoogleOnboarding'

vi.mock('../../api/api', () => ({ default: { get: vi.fn(), post: vi.fn() } }))
vi.mock('../../config/firebase', () => ({ auth: {} }))
vi.mock('firebase/auth', () => ({ signOut: vi.fn() }))

const GOOGLE_USER = { _id: 'u1', email: 'ravi@gmail.com', role: 'user', userType: 'student', isProfileComplete: false }

const renderOnboarding = () => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user: GOOGLE_USER, loading: false, isInitialized: true, error: null, success: null, sessionExpired: false } },
  })
  return render(
    <Provider store={store}>
      <MemoryRouter>
        <GoogleOnboarding />
      </MemoryRouter>
    </Provider>,
  )
}

const experienceButtons = () =>
  screen.queryAllByRole('button', { name: /^\d\+? years?$/ }).map((b) => b.textContent)

describe('years of work experience on Google onboarding (bug 4)', () => {
  it('shows a fresher only 0 to 2 years', () => {
    renderOnboarding()

    fireEvent.click(screen.getByRole('button', { name: 'Fresher' }))

    expect(screen.getByText('Years of work experience')).toBeInTheDocument()
    expect(experienceButtons()).toEqual(['0 years', '1 year', '2 years'])
  })

  it('shows a working professional every choice', () => {
    renderOnboarding()

    fireEvent.click(screen.getByRole('button', { name: 'Working professional' }))

    expect(experienceButtons()).toEqual(['0 years', '1 year', '2 years', '3 years', '4 years', '5 years', '5+ years'])
  })

  it('drops a professional-only answer when the user switches to Fresher', () => {
    renderOnboarding()
    fireEvent.click(screen.getByRole('button', { name: 'Working professional' }))
    fireEvent.click(screen.getByRole('button', { name: '4 years' }))

    fireEvent.click(screen.getByRole('button', { name: 'Fresher' }))

    expect(screen.queryByRole('button', { name: '4 years' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '0 years' })).toHaveClass('bg-[#008bdc]')
  })
})
