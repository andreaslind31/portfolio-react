"use client";

import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { BlendFunction } from "postprocessing";

export default function PostProcessing() {
  return (
    <EffectComposer>
      <Bloom
        intensity={0.15}
        luminanceThreshold={0.7}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <Vignette
        eskil={false}
        offset={0.35}
        darkness={0.65}
        blendFunction={BlendFunction.NORMAL}
      />
    </EffectComposer>
  );
}
