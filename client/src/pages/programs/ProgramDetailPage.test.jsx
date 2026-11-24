import { configureStore } from '@reduxjs/toolkit'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import api from '../../api/api'
import authReducer from '../../redux/features/authSlice'
import ProgramDetailPage from './ProgramDetailPage'

vi.mock('../../api/api', () => ({ default: { post: vi.fn() } }))
vi.mock('../../utils/captcha', () => ({ getCaptchaToken: vi.fn().mockResolvedValue('captcha-token') }))

const SLUG = 'full-stack-web-development'

const renderPage = ({ user = null, slug = SLUG } = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer },
    preloadedState: { auth: { user, loading: false, isInitialized: true, error: null, success: null, sessionExpired: false } },
  })
  return render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[`/programs/${slug}`]}>
        <Routes>
          <Route path="/programs/:slug" element={<ProgramDetailPage />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
}

const fill = (label, value) => fireEvent.change(screen.getByLabelText(label), { target: { value } })
const fillValidForm = () => {
  fill(/Full name/, 'Priya Sharma')
  fill(/Email/, 'Priya@Example.com ')
  fill(/Mobile number/, '98765 43210')
  fill(/Level/, 'advanced')
  fill(/Anything you'd like us to know/, ' Weekend classes? ')
}
const send = () => fireEvent.click(screen.getByRole('button', { name: 'Send enquiry' }))

describe('career programme page with the enquiry form (C13, C14)', () => {
  beforeEach(() => {
    api.post.mockReset()
  })

  it('shows the programme, its levels and Enquire now, with no trainer, batch or timing', () => {
    renderPage()

    expect(screen.getByRole('heading', { level: 1, name: 'Full Stack Web Development' })).toBeInTheDocument()
    expect(screen.getByText('12-16 weeks')).toBeInTheDocument()
    for (const level of ['Foundation', 'Professional', 'Advanced']) {
      expect(screen.getByRole('option', { name: level })).toBeInTheDocument()
    }
    expect(screen.getByRole('button', { name: 'Enquire now' })).toBeInTheDocument()
    expect(document.body.textContent).not.toMatch(/\b(trainers?|batch(es)?|timings?|schedules?)\b/i)
  })

  it('does not send an incomplete enquiry and says what is missing', () => {
    renderPage()

    send()

    expect(screen.getByText('Enter your name (2 to 50 characters).')).toBeInTheDocument()
    expect(screen.getByText('Enter a valid email.')).toBeInTheDocument()
    expect(screen.getByText('Enter a 10-digit mobile number.')).toBeInTheDocument()
    expect(screen.getByText('Choose a level.')).toBeInTheDocument()
    expect(api.post).not.toHaveBeenCalled()
  })

  it('sends the enquiry to the programme and thanks the student', async () => {
    api.post.mockResolvedValue({ data: { success: true } })
    renderPage()

    fillValidForm()
    send()

    expect(await screen.findByText("Thank you, we've got your enquiry")).toBeInTheDocument()
    expect(api.post).toHaveBeenCalledWith(`/programs/${SLUG}/enquiry`, {
      name: 'Priya Sharma',
      email: 'priya@example.com',
      phone: '9876543210',
      countryCode: '+91',
      level: 'advanced',
      message: 'Weekend classes?',
      captchaToken: 'captcha-token',
    })
  })

  it("shows the server's message under the field it names", async () => {
    api.post.mockRejectedValue({ response: { status: 400, data: { field: 'phone', message: 'This number looks invalid.' } } })
    renderPage()

    fillValidForm()
    send()

    expect(await screen.findByText('This number looks invalid.')).toBeInTheDocument()
    expect(screen.queryByText("Thank you, we've got your enquiry")).not.toBeInTheDocument()
  })

  it('says to try later when there are too many enquiries', async () => {
    api.post.mockRejectedValue({ response: { status: 429, data: {} } })
    renderPage()

    fillValidForm()
    send()

    expect(await screen.findByRole('alert')).toHaveTextContent('Too many enquiries. Please try again later.')
  })

  it("fills in a signed-in student's name, email and phone", async () => {
    renderPage({ user: { _id: 'u1', fullName: 'Ravi Kumar', email: 'ravi@gmail.com', phone: '+919123456789', role: 'user' } })

    expect(screen.getByLabelText(/Full name/)).toHaveValue('Ravi Kumar')
    expect(screen.getByLabelText(/Email/)).toHaveValue('ravi@gmail.com')
    await waitFor(() => expect(screen.getByLabelText(/Mobile number/)).toHaveValue('9123456789'))
  })
})
