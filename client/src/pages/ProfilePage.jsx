import { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { updateMyProfile } from '../services/userService'

function ProfilePage() {
  const { user, refreshUser } = useAuth()
  const { addToast } = useToast()

  const [name, setName] = useState(user?.name || '')
  const [email, setEmail] = useState(user?.email || '')
  const [savingEmail, setSavingEmail] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [savingPassword, setSavingPassword] = useState(false)

  const handleEmailUpdate = async (event) => {
    event.preventDefault()

    if (!name.trim()) {
      addToast('Name is required.', 'error')
      return
    }

    if (!email.trim()) {
      addToast('Email is required.', 'error')
      return
    }

    setSavingEmail(true)
    try {
      await updateMyProfile({ name: name.trim(), email: email.trim() })
      await refreshUser()
      addToast('Profile details updated.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update profile details.', 'error')
    } finally {
      setSavingEmail(false)
    }
  }

  const handlePasswordUpdate = async (event) => {
    event.preventDefault()

    if (!currentPassword || !newPassword) {
      addToast('Both current and new password are required.', 'error')
      return
    }

    setSavingPassword(true)
    try {
      await updateMyProfile({
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      addToast('Password updated successfully.', 'success')
    } catch (err) {
      addToast(err?.response?.data?.message || 'Unable to update password.', 'error')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <section className="space-y-5">
      <div>
        <h1 className="page-title">Profile & Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Manage your account email and password.</p>
      </div>

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Account</p>
        <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={handleEmailUpdate}>
          <input
            type="text"
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Full name"
          />
          <input
            type="email"
            className="input"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
          />
          <button type="submit" className="btn btn-primary" disabled={savingEmail}>
            {savingEmail ? 'Saving...' : 'Update Profile'}
          </button>
        </form>
        <p className="mt-2 text-xs text-slate-500">Current account: {user?.name || 'N/A'} • {user?.email || 'N/A'}</p>
      </article>

      <article className="panel p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.15em] text-slate-500">Security</p>
        <form className="mt-3 grid gap-2 md:grid-cols-3" onSubmit={handlePasswordUpdate}>
          <input
            type="password"
            className="input"
            value={currentPassword}
            onChange={(event) => setCurrentPassword(event.target.value)}
            placeholder="Current password"
          />
          <input
            type="password"
            className="input"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            placeholder="New password"
          />
          <button type="submit" className="btn btn-secondary" disabled={savingPassword}>
            {savingPassword ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </article>
    </section>
  )
}

export default ProfilePage
