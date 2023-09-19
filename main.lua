light = require "light"

vec3 = lovr.math.vec3

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
    world:update(1 / 60)
end

function lovr.draw(pass)
    pass:setShader(nil)

    pass:text('hello world', vec3(0, 1.7, -3))

    light.apply(pass)

    x, y, z = ground:getPosition()
    width, height, depth = ground:getShapes()[1]:getDimensions()

    pass:box(x, y, z, width, height, depth, 0, 0, 1, 0, 'line')

    pass:setMaterial(bunnyTexture)
    pass:draw(bunnyModel, 0, 1, 0, 1)
end
