// Vertex shader for triangle rendering
// WebGPU uses WGSL (WebGPU Shading Language)

struct Uniforms {
    mvpMatrix: mat4x4<f32>,
    color: vec4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
};

@vertex
fn main(@location(0) position: vec4<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.position = uniforms.mvpMatrix * position;
    return output;
}