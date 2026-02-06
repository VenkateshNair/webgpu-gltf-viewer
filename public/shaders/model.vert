// Model Vertex Shader
// Input: vec3 position at location 0, vec2 texcoord at location 1
// Uniform: MVP matrix at binding 0

struct Uniforms {
    mvpMatrix: mat4x4<f32>,
};

@group(0) @binding(0) var<uniform> uniforms: Uniforms;

struct VSOut {
    @builtin(position) position: vec4<f32>,
    @location(0) texcoord: vec2<f32>,
};

@vertex
fn main(@location(0) position: vec3<f32>, @location(1) texcoord: vec2<f32>) -> VSOut {
    var out: VSOut;
    out.position = uniforms.mvpMatrix * vec4<f32>(position, 1.0);
    out.texcoord = texcoord;
    return out;
}