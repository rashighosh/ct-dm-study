import { TalkingHead } from './talkinghead-files/talkinghead.mjs'

export async function initCompanionPreview(containerNode, model, body) {
  const preview = new TalkingHead(containerNode, {
    lipsyncModules: ['en'],
    cameraY: 0.51,
    cameraDistance: 1,
    cameraView: 'head',
    avatarIdleEyeContact: 1,
    avatarIdleHeadMove: 1,
    cameraRotateEnable: false,
    cameraPanEnable: false,
    cameraZoomEnable: false,
  })

  await preview.showAvatar({
    url: model,
    body: body,
    avatarMood: 'neutral',
    lipsyncLang: 'en',
  })

  return preview
}
