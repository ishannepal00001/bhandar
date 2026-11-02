// uploads: types for the model
// Upload: A row of the uploads table (migrations/0006_uploads.sql). filename is the B2 key.
export type Upload = {
  id: string
  user_id: number
  name: string
  filename: string
  content_type: string
  size: number
  status: 'pending' | 'ready'
  created_at: string
}
