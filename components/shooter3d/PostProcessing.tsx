"use client";

import { EffectComposer, Bloom, Vignette, ChromaticAberration } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";
import * as THREE from "three";

export default function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        intensity={1.0}
        luminanceThreshold={0.15}
        luminanceSmoothing={0.8}
        mipmapBlur
      />
      <Vignette
        eskil={false}
        offset={0.3}
        darkness={0.5}
        blendFunction={BlendFunction.NORMAL}
      />
      <ChromaticAberration
        offset={new THREE.Vector2(0.0005, 0.0005)}
        blendFunction={BlendFunction.NORMAL}
        radialModulation={true}
        modulationOffset={0.5}
      />
    </EffectComposer>
  );
}
