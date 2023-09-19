light = require "light"
motion = require "motion"

vec3 = lovr.math.vec3

lovr.graphics.setBackgroundColor(0.1, 0.1, 0.1)

function lovr.load()
    world = lovr.physics.newWorld()

    world:setLinearDamping(.01)
    world:setAngularDamping(.005)

    ground = world:newBoxCollider(0, 0, 0, 50, .5, 50)
    ground:setKinematic(true)

    bunnyModel = lovr.graphics.newModel('assets/bunny.obj')
    bunnyTexture = lovr.graphics.newTexture('assets/bunny_base.png')

    lovr.timer.step()
end

function lovr.update(dt)
    motion.teleport(dt)
    world:update(1 / 60)
end

function lovr.draw(pass)
    ----- teleportation -----
    pass:transform(mat4(motion.pose):invert())
    -- Render hands
    pass:setColor(1,1,1)
    local radius = 0.04
    for _, hand in ipairs(lovr.headset.getHands()) do
        -- Whenever pose of hand or head is used, need to account for VR movement
        local poseRW = mat4(lovr.headset.getPose(hand))
        local poseVR = mat4(motion.pose):mul(poseRW)
        poseVR:scale(radius)
        pass:sphere(poseVR)
    end
    -- Some scenery
    lovr.math.setRandomSeed(0)

    local goldenRatio = (math.sqrt(5) + 1) / 2
    local goldenAngle = (2 - goldenRatio) * (2 * math.pi)
    local k = 1.8

    for i = 1, 500 do
        local r = math.sqrt(i) * k
        local x = math.cos(goldenAngle * i) * r
        local y = math.sin(goldenAngle * i) * r
        if lovr.math.random() < 0.05 then
            pass:setColor(0.8, 0.5, 0)
        else
            local shade = 0.1 + 0.3 * lovr.math.random()
            pass:setColor(shade, shade, shade)
        end
        pass:cylinder(x, -0.01, y,  1,0.02, math.pi / 2, 1,0,0)
    end

    motion.drawTeleport(pass)
    
    pass:setColor(1, 1, 1, 1)

    pass:setShader(nil)

    pass:text('hello world', vec3(0, 1.7, -3))

    light.apply(pass)

    x, y, z = ground:getPosition()
    width, height, depth = ground:getShapes()[1]:getDimensions()

    pass:box(x, y, z, width, height, depth, 0, 0, 1, 0, 'line')

    pass:setMaterial(bunnyTexture)
    pass:draw(bunnyModel, 0, 1, 0, 1, lovr.timer.getTime(), 0, 1, 0)
end
