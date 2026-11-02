// facades: the clips' junction; call its store and functions as clipsFacade.useClipStore((state) => state.clips)
// setSource, setUploadId, setCaption, startClip, endClip, cancelClip, removeClip, moveClip, reset: Taken once from the
//   store; zustand actions never change, so they're safe to call anywhere.
import { useClipStore } from '../stores/useClipStore'

const { setSource, setUploadId, setCaption, startClip, endClip, cancelClip, removeClip, moveClip, reset } =
  useClipStore.getState()

export const clipsFacade = {
  useClipStore,
  setSource,
  setUploadId,
  setCaption,
  startClip,
  endClip,
  cancelClip,
  removeClip,
  moveClip,
  reset,
}
