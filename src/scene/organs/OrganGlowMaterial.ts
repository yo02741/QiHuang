import { AdditiveBlending, Color, ShaderMaterial } from 'three'

/**
 * 臟腑光暈材質：加法混合的 fresnel 發光（全案唯一自訂 shader）。
 * 加法混合可交換 → 臟腑互相重疊不需排序、永不 z-fight；
 * ShaderMaterial 不過 tone mapping → uIntensity > 1 直接被 bloom 拾取。
 */
export function makeOrganGlowMaterial(color: string): ShaderMaterial {
  return new ShaderMaterial({
    uniforms: {
      uColor: { value: new Color(color) },
      uIntensity: { value: 0 },
      uOpacity: { value: 0 },
    },
    vertexShader: /* glsl */ `
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vN = normalize(normalMatrix * normal);
        vV = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uIntensity;
      uniform float uOpacity;
      varying vec3 vN;
      varying vec3 vV;
      void main() {
        float fres = pow(1.0 - abs(dot(normalize(vN), normalize(vV))), 2.0);
        vec3 c = uColor * (0.35 + fres) * uIntensity;
        gl_FragColor = vec4(c, uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}
