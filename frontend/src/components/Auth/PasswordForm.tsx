import { ArrowRight, Eye, EyeOff, KeyRound } from 'lucide-react'
import { useState } from 'react'
import { muted } from '../../styles'

function PasswordForm({ onSubmit }: { onSubmit: (password: string) => void }) {
  const [password, setPassword] = useState('')
  const [visible, setVisible] = useState(false)

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit(password)
      }}
    >
      <label htmlFor="password" className={`text-xs uppercase tracking-widest ${muted}`}>
        Password
      </label>
      <div className="mt-3 flex items-center gap-2 border border-primary/30 px-3 focus-within:border-primary dark:border-night-primary/30 dark:focus-within:border-night-primary">
        <KeyRound size={16} className={`shrink-0 ${muted}`} />
        <input
          id="password"
          type={visible ? 'text' : 'password'}
          required
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          className="min-w-0 flex-1 bg-transparent py-2.5 text-sm placeholder:text-primary/40 focus:outline-none dark:placeholder:text-night-primary/40"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
          className={`shrink-0 hover:text-primary dark:hover:text-night-primary ${muted}`}
        >
          {visible ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      <button
        type="submit"
        className="flex w-full items-center justify-center gap-2 bg-primary px-6 py-2.5 text-sm text-background hover:bg-primary/90 dark:bg-night-primary dark:text-night-background dark:hover:bg-night-primary/90"
      >
        Continue
        <ArrowRight size={16} />
      </button>
    </form>
  )
}

export default PasswordForm
