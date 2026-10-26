// Types for the isUser middleware.
import type { TokenUser } from '../../modules/auth/utils.types'

export type IsUserEnv = {
  Variables: {
    user: TokenUser
  }
}
