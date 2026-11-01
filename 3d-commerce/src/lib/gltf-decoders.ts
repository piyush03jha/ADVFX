import { useGLTF } from "@react-three/drei";

// drei defaults to Google's gstatic CDN for the Draco decoder, which costs an extra
// DNS + TLS connection before a compressed model can even start parsing. Serve it
// from our own origin instead (files live in public/draco/gltf, copied from three).
useGLTF.setDecoderPath("/draco/gltf/");
