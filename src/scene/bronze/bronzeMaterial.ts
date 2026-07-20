import { MeshPhysicalMaterial } from 'three'
import { COLORS } from '@/lib/constants'

/**
 * 博物館古銅材質：金屬 PBR + 程序化氧化包漿。
 *
 * 銅人幾何是合併後的單一 BufferGeometry（無一致 UV），故包漿以
 * 「物件空間座標 + 法線」在 shader 內程序化生成，不需貼圖：
 * - 銅綠（verdigris）沉在凹處（法線朝下）與下身（近臺座），並帶雲斑雜訊
 * - 高處/朝外的凸面保持磨亮（低 roughness），像被摩挲過的天聖銅人
 * - 包漿處金屬度下降、roughness 上升（腐蝕層本是介電、粗糙）
 *
 * 仍是 MeshPhysicalMaterial，透視淡出（opacity/depthWrite）照舊由
 * BronzeMan 的 useFrame 控制，不受 onBeforeCompile 影響。
 */
export function createBronzeMaterial(): MeshPhysicalMaterial {
  const mat = new MeshPhysicalMaterial({
    color: COLORS.bronze,
    metalness: 1,
    roughness: 0.32,
    clearcoat: 0.3,
    clearcoatRoughness: 0.45,
    envMapIntensity: 1.15,
    transparent: true,
  })

  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vPatinaPos;\nvarying vec3 vPatinaN;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\n  vPatinaPos = transformed;\n  vPatinaN = normalize(objectNormal);',
      )

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
varying vec3 vPatinaPos;
varying vec3 vPatinaN;
float qhHash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float qhNoise(vec3 x){
  vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(qhHash(i + vec3(0,0,0)), qhHash(i + vec3(1,0,0)), f.x),
                 mix(qhHash(i + vec3(0,1,0)), qhHash(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(qhHash(i + vec3(0,0,1)), qhHash(i + vec3(1,0,1)), f.x),
                 mix(qhHash(i + vec3(0,1,1)), qhHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float qhAged(){
  float down = smoothstep(0.15, -0.5, vPatinaN.y);          // 凹處/下緣積綠
  float low  = 1.0 - smoothstep(0.2, 1.5, vPatinaPos.y);     // 下身較舊
  float mott = qhNoise(vPatinaPos * 23.0) * 0.6 + qhNoise(vPatinaPos * 7.0) * 0.4;
  return clamp(0.5 * down + 0.3 * low * mott + 0.55 * (mott - 0.38), 0.0, 1.0) * 0.9;
}`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
{
  float aged = qhAged();
  vec3 verdigris = vec3(0.24, 0.46, 0.39);
  diffuseColor.rgb = mix(diffuseColor.rgb, verdigris, aged * 0.72);
}`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
{
  float aged = qhAged();
  float polish = smoothstep(0.3, 0.95, vPatinaN.y) * (1.0 - aged);
  roughnessFactor = mix(roughnessFactor, 0.85, aged);
  roughnessFactor = mix(roughnessFactor, 0.16, polish * 0.5);
}`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
{ float aged = qhAged(); metalnessFactor = mix(metalnessFactor, 0.1, aged * 0.8); }`,
      )
  }

  return mat
}
