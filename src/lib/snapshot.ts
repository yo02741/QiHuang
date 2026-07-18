import type { Camera, Scene, WebGLRenderer } from 'three'

/**
 * WebGL 快照橋：場景內的 SnapshotBridge 註冊 renderer/scene/camera，
 * UI 層（成績卡）呼叫 captureSnapshot() 取得當下畫面。
 * 讀取前先同步 re-render 一次，因此不需要常駐 preserveDrawingBuffer。
 */
let refs: { gl: WebGLRenderer; scene: Scene; camera: Camera } | null = null

export function registerSnapshot(gl: WebGLRenderer, scene: Scene, camera: Camera): void {
  refs = { gl, scene, camera }
}

export function captureSnapshot(): string | null {
  if (!refs) return null
  try {
    refs.gl.render(refs.scene, refs.camera)
    return refs.gl.domElement.toDataURL('image/png')
  } catch {
    return null
  }
}
