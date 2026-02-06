// Fragment shader for triangle rendering
// WebGPU uses WGSL (WebGPU Shading Language)

struct Uniforms {
    mvpMatrix: mat4x4<f32>,
    color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

@fragment
fn main() -> @location(0) vec4<f32> {
    // Use color from GUI controls
    return uniforms.color;
}