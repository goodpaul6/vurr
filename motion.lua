-- right trigger: teleport-jump to targeted location
-- right thumbstick: rotate the view horizontally

local motion = {
    pose = lovr.math.newMat4(), -- Transformation in VR initialized to origin (0,0,0) looking down -Z
    thumbstickDeadzone = 0.4,   -- Smaller thumbstick displacements are ignored (too much noise)
    -- Snap motion parameters
    snapTurnAngle = 2 * math.pi / 12,
    thumbstickCooldownTime = 0.3,
    thumbstickCooldown = 0,
    -- Teleport motion parameters
    teleportDistance = 12,
    blinkTime = 0.5,
    blinkStopwatch = math.huge,
    teleportValid = false,
    targetPosition = lovr.math.newVec3(),
    teleportCurve = lovr.math.newCurve(3),
}

function motion.teleport(dt)
    -- Teleportation determining target position and executing jump when triggered
    local handPose = mat4(motion.pose):mul(mat4(lovr.headset.getPose('hand/right/point')))
    local handPosition = vec3(handPose)
    local handDirection = quat(handPose):direction()
    -- Intersect with ground plane
    local ratio =  vec3(handPose).y / handDirection.y
    local intersectionDistance = math.sqrt(handPosition.y^2 + (handDirection.x * ratio)^2 + (handDirection.z * ratio)^2)
    motion.targetPosition:set(handPose:translate(0, 0, -intersectionDistance))
    -- Check if target position is a valid teleport target
    motion.teleportValid = motion.targetPosition.y < handPosition.y and
    (handPosition - motion.targetPosition):length() < motion.teleportDistance
    -- Construct teleporter visualization curve
    local midPoint = vec3(handPosition):lerp(motion.targetPosition, 0.3)
    if motion.teleportValid then
        midPoint:add(vec3(0, 0.1 * intersectionDistance, 0)) -- Fake a parabola
    end
    motion.teleportCurve:setPoint(1, handPosition)
    motion.teleportCurve:setPoint(2, midPoint)
    motion.teleportCurve:setPoint(3, motion.targetPosition)
    -- Start timer when jump is triggered, preform jump on half-blink
    if lovr.headset.wasPressed('right', 'trigger') and motion.teleportValid then
        motion.blinkStopwatch = -motion.blinkTime / 2
    end
    -- Preform jump with VR pose offset by relative distance between here and there
    if motion.blinkStopwatch < 0 and
        motion.blinkStopwatch + dt >= 0 then
        local headsetXZ = vec3(lovr.headset.getPosition())
        headsetXZ.y = 0
        local newPosition = motion.targetPosition - headsetXZ
        motion.pose:set(newPosition, vec3(1,1,1), quat(motion.pose)) -- ZAAPP
    end
    -- Snap horizontal turning (often combined with teleport mechanics)
    if lovr.headset.isTracked('right') then
        local x, y = lovr.headset.getAxis('right', 'thumbstick')
        if math.abs(x) > motion.thumbstickDeadzone and motion.thumbstickCooldown < 0 then
            local angle = -x / math.abs(x) * motion.snapTurnAngle
            motion.pose:rotate(angle, 0, 1, 0)
            motion.thumbstickCooldown = motion.thumbstickCooldownTime
        end
    end
    motion.blinkStopwatch = motion.blinkStopwatch + dt
    motion.thumbstickCooldown = motion.thumbstickCooldown - dt
end

function motion.drawTeleport(pass)
    -- Teleport target and curve
    pass:setColor(1, 1, 1, 0.1)
    if motion.teleportValid then
        pass:setColor(1, 1, 0)
        pass:cylinder(motion.targetPosition, 0.4,0.05, math.pi/2,  1,0,0)
        pass:setColor(1, 1, 1)
    end
    --lovr.graphics.setLineWidth(4)
    pass:line(motion.teleportCurve:render(30))
    -- Teleport blink, modeled as gaussian function
    local blinkAlpha = math.exp(-(motion.blinkStopwatch/ 0.25 / motion.blinkTime)^2)
    pass:setColor(0,0,0, blinkAlpha)
    -- TODO uncomment this once we figure out how to render everything together
    -- pass:fill()
end

return motion
