// Renders a page the way the app does: a fresh Redux store and a router. Any route the page
// navigates to renders its path, so a test can check where the user was sent.
import { configureStore } from '@reduxjs/toolkit'
import { render } from '@testing-library/react'
import { Provider } from 'react-redux'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import authReducer from '../redux/features/authSlice'
import resumeReducer from '../redux/features/resumeSlice'
import CurrentLocation from './CurrentLocation'

/**
 * @param {JSX.Element} ui - the page under test
 * @param {{ path?: string, route?: string, user?: object|null }} options
 *   path: the route pattern the page is mounted on; route: the URL to open;
 *   user: the signed-in user (null for signed out)
 */
export const renderWithProviders = (ui, { path = '/', route = path, user = null } = {}) => {
  const store = configureStore({
    reducer: { auth: authReducer, resume: resumeReducer },
    preloadedState: {
      auth: { user, loading: false, isInitialized: true, error: null, success: null, sessionExpired: false },
    },
  })
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={<CurrentLocation />} />
        </Routes>
      </MemoryRouter>
    </Provider>,
  )
  return { store, ...result }
}
