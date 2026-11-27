import { useLocation } from 'react-router-dom'

// Shows the current path, so a test can check where a page sent the user.
export default function CurrentLocation() {
  const { pathname, search } = useLocation()
  return <p data-testid="location">{pathname + search}</p>
}
