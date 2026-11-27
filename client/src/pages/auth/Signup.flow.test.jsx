import { fireEvent, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../api/api'
import { TERMS_VERSION } from '../../config/legal'
import { renderWithProviders } from '../../test/renderWithProviders'
import Signup from './Signup'

vi.mock('../../api/api', () => ({ default: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))
vi.mock('../../config/firebase', () => ({ auth: {}, googleProvider: {} }))
vi.mock('firebase/auth', () => ({ signInWithPopup: vi.fn() }))
vi.mock('../../utils/captcha', () => ({ getCaptchaToken: vi.fn().mockResolvedValue('captcha-token') }))

const EMAIL = 'asha@example.com'
const YEAR = new Date().getFullYear()
const NEW_USER = { _id: 'u1', fullName: 'Asha Rao', email: EMAIL, role: 'user', userType: 'student' }

// Answers POST requests by URL; `register` decides how account creation goes.
const serve = (register = async () => ({ data: { success: true, user: NEW_USER, token: 'jwt-token' } })) => {
  api.post.mockImplementation(async (url, body) => {
    if (url === '/auth/send-otp') return { data: { success: true } }
    if (url === '/auth/verify-otp') return { data: { success: true, email: EMAIL, verificationToken: 'verified-token' } }
    if (url === '/auth/register') return register(body)
    throw new Error(`unexpected POST ${url}`)
  })
}
const calls = (url) => api.post.mock.calls.filter(([u]) => u === url)

const type = (placeholder, value) => fireEvent.change(screen.getByPlaceholderText(placeholder), { target: { value } })
const click = (name) => fireEvent.click(screen.getByRole('button', { name }))
const createButton = () => screen.getByRole('button', { name: /create account/i })
const consentBox = () => screen.getByRole('checkbox', { name: /i agree to the terms and privacy policy/i })

// Step 1: email + password, then the emailed code. Step 2: profile. Ends on step 3.
const reachConsentStep = async () => {
  const view = renderWithProviders(<Signup />, { path: '/register' })

  click('Sign up with email')
  type('Enter your email address', EMAIL)
  type('At least 6 chars', 'Password@123')
  type('Re-enter password', 'Password@123')
  click('Verify Email')
  fireEvent.change(await screen.findByPlaceholderText('000000'), { target: { value: '123456' } })
  click('Submit OTP')
  fireEvent.click(await screen.findByRole('button', { name: /next: fill profile details/i }))

  type('Enter your first name', 'Asha')
  type('Enter your last name', 'Rao')
  type('Enter 10-digit number', '9876543210')
  type('Current location', 'Pune')
  fireEvent.click(screen.getByRole('button', { name: /female/i }))
  click('B.Tech')
  type('Eg. BITS Pilani', 'Geeta University')
  fireEvent.change(view.container.querySelector('select[name="startYear"]'), { target: { value: String(YEAR) } })
  fireEvent.change(view.container.querySelector('select[name="endYear"]'), { target: { value: String(YEAR + 3) } })
  click(/next: areas of interest/i)

  await screen.findByRole('button', { name: /create account/i })
  return view
}
const verifyHuman = async () => {
  fireEvent.click(screen.getByRole('checkbox', { name: /verify before continuing/i }))
  await waitFor(() => expect(screen.getByRole('checkbox', { name: /verify before continuing/i })).toBeChecked())
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

describe('signup with mandatory consent flow', () => {
  it('creates the account only after the Terms box is ticked, and sends the consent', async () => {
    serve()
    const { store } = await reachConsentStep()

    expect(calls('/auth/send-otp')[0][1]).toMatchObject({ email: EMAIL })
    expect(calls('/auth/verify-otp')[0][1]).toEqual({ email: EMAIL, otp: '123456' })

    await verifyHuman()
    expect(consentBox()).not.toBeChecked()
    expect(createButton()).toBeDisabled()

    fireEvent.click(consentBox())
    expect(createButton()).toBeEnabled()
    fireEvent.click(createButton())

    expect(await screen.findByText('Upload Your Resume')).toBeInTheDocument()
    expect(calls('/auth/register')).toHaveLength(1)
    expect(calls('/auth/register')[0][1]).toMatchObject({
      acceptedTerms: true,
      termsVersion: TERMS_VERSION,
      verificationToken: 'verified-token',
      email: EMAIL,
      firstName: 'Asha',
      lastName: 'Rao',
      phone: '9876543210',
      college: 'Geeta University',
      course: 'B.Tech',
      type: 'student',
      captchaToken: 'captcha-token',
    })
    expect(store.getState().auth.user).toEqual(NEW_USER)
    // The removed /auth/check-phone endpoint is no longer called on the way.
    expect(calls('/auth/check-phone')).toHaveLength(0)
  })

  it('disables Create Account again when the Terms box is unticked, and sends nothing', async () => {
    serve()
    await reachConsentStep()
    await verifyHuman()

    fireEvent.click(consentBox())
    fireEvent.click(consentBox())
    expect(consentBox()).not.toBeChecked()
    expect(createButton()).toBeDisabled()

    fireEvent.click(createButton())

    expect(calls('/auth/register')).toHaveLength(0)
    expect(screen.queryByText('Upload Your Resume')).not.toBeInTheDocument()
  })

  it('links the Terms and Privacy Policy from the consent box', async () => {
    serve()
    await reachConsentStep()

    expect(screen.getByRole('link', { name: 'Terms' })).toHaveAttribute('href', '/terms')
    expect(screen.getByRole('link', { name: 'Privacy Policy' })).toHaveAttribute('href', '/privacy')
  })

  it('shows the server message and stays on this step when the server refuses the consent', async () => {
    serve(async () => {
      throw {
        response: {
          status: 400,
          data: { code: 'CONSENT_REQUIRED', field: 'acceptedTerms', message: 'Please agree to the Terms and Privacy Policy to create your account.' },
        },
      }
    })
    const { store } = await reachConsentStep()
    await verifyHuman()
    fireEvent.click(consentBox())

    fireEvent.click(createButton())

    expect(await screen.findByText('Please agree to the Terms and Privacy Policy to create your account.')).toBeInTheDocument()
    expect(createButton()).toBeInTheDocument()
    expect(screen.queryByText('Upload Your Resume')).not.toBeInTheDocument()
    expect(store.getState().auth.user).toBeNull()
  })

  it('requires the human check as well as consent', async () => {
    serve()
    await reachConsentStep()
    fireEvent.click(consentBox())

    fireEvent.click(createButton())

    expect(await screen.findByText('Please verify that you are not a robot.')).toBeInTheDocument()
    expect(calls('/auth/register')).toHaveLength(0)
  })

  it('takes the user back to the profile step when the server says the mobile number is taken', async () => {
    serve(async () => {
      throw { response: { status: 409, data: { success: false, field: 'phone', message: 'Mobile number is already registered' } } }
    })
    await reachConsentStep()
    await verifyHuman()
    fireEvent.click(consentBox())

    fireEvent.click(createButton())

    expect(await screen.findByPlaceholderText('Enter 10-digit number')).toBeInTheDocument()
    expect(screen.getAllByText('Mobile number is already registered').length).toBeGreaterThan(0)
    expect(calls('/auth/check-phone')).toHaveLength(0)
  })
})
