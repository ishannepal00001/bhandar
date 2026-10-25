// Types for the isUser middleware.
import type { TokenUser } from '../../modules/auth/utils'

export type IsUserEnv = {
  Variables: {
    user: TokenUser
  }
}
