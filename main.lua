light = require "light"

vec3 = lovr.math.vec3

function lovr.load()
    world = lovr.physics.newWorld()

    world:setLinearDamping(.01)
    world:setAngularDamping(.005)

    ground = world:newBoxCollider(0, 0, 0, 50, .5, 50)

    ground:setKinematic(true)

    balls = {}

    for i = 1, 50 do
        table.insert(balls, {
            collider = world:newSphereCollider(
                vec3(lovr.math.random(-5.0, 5.0), 
                     lovr.math.random(10.0, 20.0), 
                     lovr.math.random(-5, 5)),
                .02
            )
        })
    end

    lovr.timer.step()
end

function lovr.update(dt)
    world:update(1 / 60)
end

function lovr.draw(pass)
    pass:setShader(nil)

    pass:text('hello world', 0, 1.7, -3, .5)

    light.apply(pass)

    x, y, z = ground:getPosition()
    width, height, depth = ground:getShapes()[1]:getDimensions()

    pass:box(x, y, z, width, height, depth, 0, 0, 1, 0, 'line')

    for _, ball in ipairs(balls) do
        x, y, z = ball.collider:getPosition()

        pass:sphere(
            x, y, z, 
            ball.collider:getShapes()[1]:getRadius()
        )
    end
end
