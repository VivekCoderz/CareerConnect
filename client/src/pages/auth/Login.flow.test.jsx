import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../api/api'
import { renderWithProviders } from '../../test/renderWithProviders'
import Login from './Login'

// The page talks to the server only through the shared api client; Firebase (Google
// sign-in) and reCAPTCHA can't run in jsdom.
vi.mock('../../api/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
vi.mock('../../config/firebase', () => ({ auth: {}, googleProvider: {} }))
vi.mock('firebase/auth', () => ({ signInWithPopup: vi.fn() }))
vi.mock('../../utils/captcha', () => ({ getCaptchaToken: vi.fn().mockResolvedValue('captcha-token') }))

const STUDENT = { _id: 'u1', fullName: 'Asha Rao', email: 'asha@example.com', role: 'user', userType: 'student' }

const renderLogin = (route = '/login') => renderWithProviders(<Login />, { path: '/login', route })

const fillIn = (email, password) => {
  fireEvent.change(screen.getByPlaceholderText('Enter your email or username'), { target: { value: email } })
  fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: password } })
}
const verifyHuman = async () => {
  fireEvent.click(screen.getByRole('checkbox', { name: /verify before continuing/i }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /verify before continuing/i })).toBeChecked())
}
const signInButton = () => screen.getByRole('button', { name: /^sign in as/i })
const signIn = () => fireEvent.click(signInButton())

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
})

describe('login flow', () => {
  it('signs a student in with valid credentials and opens their dashboard', async () => {
    api.post.mockResolvedValue({ data: { success: true, user: STUDENT, token: 'jwt-token' } })
    const { store } = renderLogin()

    fillIn('  asha@example.com ', 'Password@123')
    await verifyHuman()
    signIn()

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/student/dashboard'))
    expect(api.post).toHaveBeenCalledTimes(1)
    expect(api.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({
      emailOrUsername: 'asha@example.com',
      password: 'Password@123',
      role: 'student',
      captchaToken: 'captcha-token',
    }))
    expect(store.getState().auth.user).toEqual(STUDENT)
    expect(store.getState().auth.error).toBeNull()
  })

  it('sends an employer to the employer dashboard', async () => {
    api.post.mockResolvedValue({ data: { user: { ...STUDENT, role: 'employer', userType: 'employer' }, token: 't' } })
    renderLogin()

    fireEvent.click(screen.getByRole('button', { name: 'Employer' }))
    fillIn('hr@example.com', 'Password@123')
    await verifyHuman()
    fireEvent.click(screen.getByRole('button', { name: 'Sign in as Employer' }))

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/employer/dashboard'))
    expect(api.post).toHaveBeenCalledWith('/auth/login', expect.objectContaining({ role: 'employer' }))
  })

  it('returns the user to the page they came from after signing in', async () => {
    api.post.mockResolvedValue({ data: { user: STUDENT, token: 't' } })
    renderLogin('/login?redirect=%2Fjobs%2F64b000000000000000000001')

    fillIn('asha@example.com', 'Password@123')
    await verifyHuman()
    signIn()

    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/jobs/64b000000000000000000001'))
  })

  it('shows the server error for invalid credentials and keeps the user signed out on the login page', async () => {
    api.post.mockRejectedValue({ response: { status: 401, data: { success: false, message: 'Invalid credentials' } } })
    const { store } = renderLogin()

    fillIn('asha@example.com', 'WrongPass@123')
    await verifyHuman()
    signIn()

    expect(await screen.findByText('Invalid credentials')).toBeInTheDocument()
    expect(screen.queryByTestId('location')).not.toBeInTheDocument()
    expect(signInButton()).toBeEnabled()
    expect(store.getState().auth.user).toBeNull()
    expect(localStorage.getItem('careerconnect_token')).toBeNull()
  })

  it('clears the error as soon as the user edits the form again', async () => {
    api.post.mockRejectedValue({ response: { data: { message: 'Invalid credentials' } } })
    renderLogin()
    fillIn('asha@example.com', 'WrongPass@123')
    await verifyHuman()
    signIn()
    await screen.findByText('Invalid credentials')

    fireEvent.change(screen.getByPlaceholderText('Enter your password'), { target: { value: 'Password@123' } })

    expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument()
  })

  it('does not send anything until the human check is ticked', async () => {
    renderLogin()
    fillIn('asha@example.com', 'Password@123')

    signIn()

    expect(await screen.findByText('Please verify that you are not a robot.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('disables the button while signing in so the form is not sent twice', async () => {
    let finish
    api.post.mockReturnValue(new Promise((resolve) => { finish = resolve }))
    renderLogin()
    fillIn('asha@example.com', 'Password@123')
    await verifyHuman()

    signIn()

    const busy = await screen.findByRole('button', { name: /signing in/i })
    expect(busy).toBeDisabled()
    fireEvent.click(busy)
    expect(api.post).toHaveBeenCalledTimes(1)
    finish({ data: { user: STUDENT, token: 't' } })
    await waitFor(() => expect(screen.getByTestId('location')).toHaveTextContent('/student/dashboard'))
  })
})
