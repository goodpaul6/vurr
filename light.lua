local vertex = [[
    vec4 lovrmain()
    {
        return Projection * View * Transform * VertexPosition;
    }
]]

local fragment = [[
    Constants {
        vec4 ambience;
        vec4 lightColor;
        vec3 lightDir;
    };

    vec4 lovrmain()
    {
        //diffuse
        vec3 norm = normalize(Normal);
        float diff = max(dot(norm, lightDir), 0.0);
        vec4 diffuse = diff * lightColor;

        vec4 baseColor = Color * getPixel(ColorTexture, UV);
        return baseColor * (ambience + diffuse);
    }
]]

local light = {
    shader = lovr.graphics.newShader(vertex, fragment, {}),
    defaultAmbience = lovr.math.newVec4(0.2, 0.2, 0.2, 1.0),
    defaultLightColor = lovr.math.newVec4(1.0, 1.0, 1.0, 1.0),
    defaultLightDir = lovr.math.newVec3(1.0, 1.0, 0.0):normalize()
}

function light.apply(pass, params)
    params = params or {}

    pass:setShader(light.shader)
    
    pass:send('ambience', params.ambience or light.defaultAmbience)
    pass:send('lightColor', params.lightColor or light.defaultLightColor)

    lightDir = params.lightDir or light.defaultLightDir

    -- NOTE(Apaar): pass:send can receive either a vec3 or a table here, I've checked the C source code.
    pass:send('lightDir', lovr.math.vec3(lightDir):normalize())
end

return light
