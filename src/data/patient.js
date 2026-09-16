import { currentUser } from '../user/store'
import { publicUser } from '../user/models'

export function getCurrentPatient() {
  const user = currentUser()
  if (!user) return null
  const view = publicUser(user)
  return {
    id: view.id,
    name: view.profile.name,
    email: view.email,
  }
}
