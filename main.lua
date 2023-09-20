light = require "light"
motion = require "motion"

WHITE_COLOR = {1, 1, 1, 1}
AMBIENCE_COLOR = {0.357, 0.518, 0.718, 1.0}
GRASS_COLOR = {0.365, 0.663, 0.247, 1}
GROUND_COLOR = {0.231, 0.396, 0.243, 1}

function lovr.load()
    world = lovr.physics.newWorld()

    world:setLinearDamping(.01)
    world:setAngularDamping(.005)

    ground = world:newBoxCollider(0, 0, 0, 40, .5, 40)
    ground:setKinematic(true)

    bunnyModel = lovr.graphics.newModel('assets/bunny.obj')
    bunnyTexture = lovr.graphics.newTexture('assets/bunny_base.png')

    grassBladeModel = lovr.graphics.newModel('assets/grass_blade.obj')

    doorModel = lovr.graphics.newModel('assets/door.obj')
    doorTexture = lovr.graphics.newTexture('assets/door.png')

    lovr.timer.step()
end

function lovr.update(dt)
    motion.teleport(dt)
    world:update(1 / 60)
end

function lovr.draw(pass)
    lovr.graphics.setBackgroundColor('0x79c6d4')
    pass:setShader(nil)

    -- Move based on pose
    pass:transform(mat4(motion.pose):invert())

    pass:setColor(1, 1, 1, 1)
    pass:text('hello world', vec3(0, 1.7, -3))

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

    light.apply(pass, {
        ambience = AMBIENCE_COLOR
    })

    local x, y, z = ground:getPosition()
    local width, height, depth = ground:getShapes()[1]:getDimensions()

    local goldenRatio = (math.sqrt(5) + 1) / 2
    local goldenAngle = (2 - goldenRatio) * (2 * math.pi)
    local k = 1.2

    pass:setColor(GROUND_COLOR)
    pass:cylinder(x, y, z, 
                  width / 2, 0.5,
                  math.pi / 2, 
                  1, 0, 0)

    --pass:box(x, y, z, width, height, depth, 0, 0, 1, 0)

    for i = 1, 200 do
        local r = math.sqrt(i) * k
        local x = math.cos(goldenAngle * i) * r
        local y = math.sin(goldenAngle * i) * r

        --[[if lovr.math.random() < 0.05 then
            pass:setColor(0.8, 0.5, 0)
        else
            local shade = 0.1 + 0.3 * lovr.math.random()
            pass:setColor(shade, shade, shade)
        end]]

        for i = 1, 20 do
            pass:setColor(GRASS_COLOR)

            pass:draw(grassBladeModel, 
                      x + lovr.math.random() * 3 - 1.5, 0.5, y + lovr.math.random() * 3 - 1.5,
                      lovr.math.random() * 0.5 + 0.2,
                      math.sin(lovr.timer.getTime() * 4 + lovr.math.random() * 1.6) * 0.1,
                      1, 0, 0)
        end

        -- pass:cylinder(x, -0.01, y,  1,0.02, math.pi / 2, 1,0,0)
    end
 
    pass:setColor(WHITE_COLOR)
    pass:setMaterial(bunnyTexture)
    pass:draw(bunnyModel, 1, 1, 0, 1, lovr.timer.getTime(), 0, 1, 0)

    pass:setMaterial(doorTexture)
    pass:draw(doorModel, 0, 1, 0, 1, 0, 0, 1, 0)

    pass:setShader(nil)
    motion.drawTeleport(pass)
end
