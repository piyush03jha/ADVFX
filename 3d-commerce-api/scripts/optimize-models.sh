#!/usr/bin/env sh
set -eu
ROOT="${1:-../3d-commerce/public/models}"
echo "3D asset inventory under $ROOT"
find "$ROOT" -type f \( -name "*.glb" -o -name "*.gltf" -o -name "*.obj" \) -print
echo "Use a pinned @gltf-transform/cli asset pipeline to optimize GLB/GLTF with meshopt or Draco before publishing to R2/CDN."
