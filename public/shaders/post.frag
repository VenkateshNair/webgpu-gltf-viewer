// Post-processing fragment shader
// Samples the scene texture and applies post-processing effects

@group(0) @binding(0) var sceneSampler: sampler;
@group(0) @binding(1) var sceneTexture: texture_2d<f32>;

@fragment
fn main(@location(0) uv: vec2<f32>) -> @location(0) vec4<f32> {
    // Sample the scene texture
    let sceneColor = textureSample(sceneTexture, sceneSampler, uv);

    // Passthrough - just return the scene color
    // Uncomment the line below for an invert colors effect example:
    // return vec4<f32>(1.0 - sceneColor.rgb, sceneColor.a);

    return sceneColor;
}