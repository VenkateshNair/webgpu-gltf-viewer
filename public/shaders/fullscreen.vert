// Fullscreen quad vertex shader for post-processing
// Uses vertex index to generate positions, no vertex buffer needed

struct VSOut {
  @builtin(position) position : vec4f,
  @location(0) uv : vec2f,
};

@vertex
fn main(@builtin(vertex_index) vid : u32) -> VSOut {
  // Two triangles that form a quad:
  // 0: BL, 1: BR, 2: TL, 3: TL, 4: BR, 5: TR
  var pos = array<vec2f, 6>(
    vec2f(-1.0, -1.0), // bottom-left
    vec2f( 1.0, -1.0), // bottom-right
    vec2f(-1.0,  1.0), // top-left

    vec2f(-1.0,  1.0), // top-left
    vec2f( 1.0, -1.0), // bottom-right
    vec2f( 1.0,  1.0)  // top-right
  );

  var uv = array<vec2f, 6>(
    vec2f(0.0, 1.0), // BL → sample top-left of texture
    vec2f(1.0, 1.0), // BR → sample top-right of texture
    vec2f(0.0, 0.0), // TL → sample bottom-left of texture

    vec2f(0.0, 0.0), // TL → sample bottom-left of texture
    vec2f(1.0, 1.0), // BR → sample top-right of texture
    vec2f(1.0, 0.0)  // TR → sample bottom-right of texture
  );

  var out : VSOut;
  out.position = vec4f(pos[vid], 0.0, 1.0);
  out.uv = uv[vid];
  return out;
}