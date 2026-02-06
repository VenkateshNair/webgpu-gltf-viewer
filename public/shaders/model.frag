// Model Fragment Shader
// Sample texture and output color

@group(0) @binding(1) var textureSampler: sampler;
@group(0) @binding(2) var baseTexture: texture_2d<f32>;

@fragment
fn main(@location(0) texcoord: vec2<f32>) -> @location(0) vec4<f32> {
    // Sample the texture
    let color = textureSample(baseTexture, textureSampler, texcoord);
    return color;
}