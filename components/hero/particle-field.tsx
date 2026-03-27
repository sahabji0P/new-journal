"use client"

import { Canvas, useFrame, useThree } from "@react-three/fiber"
import { createNoise3D } from "simplex-noise"
import { useEffect, useMemo, useRef } from "react"
import * as THREE from "three"

interface ParticleFieldProps {
    reducedMotion?: boolean
}

interface SceneParticlesProps extends ParticleFieldProps {
    count: number
}

type ParticleState = {
    positions: Float32Array
    velocities: Float32Array
    colors: Float32Array
    basePositions: Float32Array
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(max, Math.max(min, value))
}

function SceneParticles({ count, reducedMotion = false }: SceneParticlesProps) {
    const pointsRef = useRef<THREE.Points>(null)
    const linesRef = useRef<THREE.LineSegments>(null)
    const mouseRef = useRef(new THREE.Vector2(10_000, 10_000))
    const skipFrameRef = useRef(false)
    const initViewportRef = useRef<{ width: number; height: number } | null>(null)
    const pointPosAttrRef = useRef<THREE.BufferAttribute | null>(null)
    const pointColAttrRef = useRef<THREE.BufferAttribute | null>(null)
    const linePosAttrRef = useRef<THREE.BufferAttribute | null>(null)
    const lineColAttrRef = useRef<THREE.BufferAttribute | null>(null)
    const noise3D = useMemo(() => createNoise3D(), [])
    const { viewport, pointer, size } = useThree()

    // Capture initial viewport dimensions — don't reset particles on resize
    if (!initViewportRef.current) {
        initViewportRef.current = { width: viewport.width, height: viewport.height }
    }

    const particleState = useMemo<ParticleState>(() => {
        const w = initViewportRef.current?.width ?? 6
        const h = initViewportRef.current?.height ?? 4
        const positions = new Float32Array(count * 3)
        const basePositions = new Float32Array(count * 3)
        const velocities = new Float32Array(count * 3)
        const colors = new Float32Array(count * 3)

        for (let index = 0; index < count; index += 1) {
            const stride = index * 3
            const x = (Math.random() - 0.5) * w
            const y = (Math.random() - 0.5) * h
            const z = (Math.random() - 0.5) * 0.8

            positions[stride] = x
            positions[stride + 1] = y
            positions[stride + 2] = z

            basePositions[stride] = x
            basePositions[stride + 1] = y
            basePositions[stride + 2] = z

            colors[stride] = 163 / 255
            colors[stride + 1] = 230 / 255
            colors[stride + 2] = 53 / 255
        }

        return { positions, velocities, colors, basePositions }
    }, [count])

    // Pre-allocate line buffers once
    const sampleCount = Math.min(count, 220)
    const maxSegments = sampleCount * 3
    const lineBuffers = useMemo(() => ({
        positions: new Float32Array(maxSegments * 6),
        colors: new Float32Array(maxSegments * 6),
    }), [maxSegments])

    // Set up BufferAttributes once on mount — reuse every frame
    useEffect(() => {
        if (!pointsRef.current || !linesRef.current) return

        const pointPosAttr = new THREE.BufferAttribute(particleState.positions, 3)
        const pointColAttr = new THREE.BufferAttribute(particleState.colors, 3)
        pointsRef.current.geometry.setAttribute("position", pointPosAttr)
        pointsRef.current.geometry.setAttribute("color", pointColAttr)
        pointPosAttrRef.current = pointPosAttr
        pointColAttrRef.current = pointColAttr

        const linePosAttr = new THREE.BufferAttribute(lineBuffers.positions, 3)
        linePosAttr.setUsage(THREE.DynamicDrawUsage)
        const lineColAttr = new THREE.BufferAttribute(lineBuffers.colors, 3)
        lineColAttr.setUsage(THREE.DynamicDrawUsage)
        linesRef.current.geometry.setAttribute("position", linePosAttr)
        linesRef.current.geometry.setAttribute("color", lineColAttr)
        linePosAttrRef.current = linePosAttr
        lineColAttrRef.current = lineColAttr
    }, [particleState, lineBuffers])

    useEffect(() => {
        mouseRef.current.set(pointer.x * (viewport.width / 2), pointer.y * (viewport.height / 2))
    }, [pointer.x, pointer.y, viewport.height, viewport.width])

    const isLowPower = typeof navigator !== "undefined" && typeof navigator.hardwareConcurrency === "number" && navigator.hardwareConcurrency < 4

    useFrame((state) => {
        if (!pointsRef.current || !linesRef.current) return
        if (!pointPosAttrRef.current || !linePosAttrRef.current) return

        if (size.width > 0 && isLowPower) {
            skipFrameRef.current = !skipFrameRef.current
            if (skipFrameRef.current) return
        }

        const time = state.clock.elapsedTime
        const positions = particleState.positions
        const velocities = particleState.velocities
        const colors = particleState.colors
        const boundaryX = viewport.width / 2
        const boundaryY = viewport.height / 2
        const attractionRadius = Math.min(viewport.width, viewport.height) * 0.22
        const repulsionRadius = attractionRadius * 0.35
        const connectionRadius = Math.min(viewport.width, viewport.height) * 0.11

        let segmentIndex = 0
        const linePositions = lineBuffers.positions
        const lineColors = lineBuffers.colors

        for (let index = 0; index < count; index += 1) {
            const stride = index * 3
            const x = positions[stride]
            const y = positions[stride + 1]
            const noiseX = noise3D(x * 0.42, y * 0.42, time * 0.12)
            const noiseY = noise3D(x * 0.42 + 100, y * 0.42 - 100, time * 0.12)

            velocities[stride] = clamp(velocities[stride] * 0.94 + noiseX * 0.0035, -0.03, 0.03)
            velocities[stride + 1] = clamp(velocities[stride + 1] * 0.94 + noiseY * 0.0035, -0.03, 0.03)

            const deltaX = mouseRef.current.x - x
            const deltaY = mouseRef.current.y - y
            const distance = Math.hypot(deltaX, deltaY)

            if (!reducedMotion && distance < attractionRadius && distance > 0) {
                const influence = 1 - distance / attractionRadius
                const direction = distance < repulsionRadius ? -1 : 1
                const force = direction * influence * influence * 0.018
                velocities[stride] += (deltaX / distance) * force
                velocities[stride + 1] += (deltaY / distance) * force
            }

            positions[stride] += velocities[stride]
            positions[stride + 1] += velocities[stride + 1]

            if (positions[stride] > boundaryX) positions[stride] = -boundaryX
            if (positions[stride] < -boundaryX) positions[stride] = boundaryX
            if (positions[stride + 1] > boundaryY) positions[stride + 1] = -boundaryY
            if (positions[stride + 1] < -boundaryY) positions[stride + 1] = boundaryY

            const colorMix = reducedMotion ? 0 : clamp(1 - distance / attractionRadius, 0, 1)
            colors[stride] = THREE.MathUtils.lerp(163 / 255, 34 / 255, colorMix)
            colors[stride + 1] = THREE.MathUtils.lerp(230 / 255, 211 / 255, colorMix)
            colors[stride + 2] = THREE.MathUtils.lerp(53 / 255, 238 / 255, colorMix)
        }

        for (let index = 0; index < sampleCount; index += 1) {
            const sourceStride = index * 3
            let connections = 0

            for (let neighbor = index + 1; neighbor < Math.min(sampleCount, index + 18); neighbor += 1) {
                if (connections >= 3 || segmentIndex >= maxSegments) break

                const targetStride = neighbor * 3
                const dx = positions[sourceStride] - positions[targetStride]
                const dy = positions[sourceStride + 1] - positions[targetStride + 1]
                const distance = Math.hypot(dx, dy)

                if (distance > connectionRadius) continue

                const opacity = 1 - distance / connectionRadius
                const bufferIndex = segmentIndex * 6

                linePositions[bufferIndex] = positions[sourceStride]
                linePositions[bufferIndex + 1] = positions[sourceStride + 1]
                linePositions[bufferIndex + 2] = positions[sourceStride + 2]
                linePositions[bufferIndex + 3] = positions[targetStride]
                linePositions[bufferIndex + 4] = positions[targetStride + 1]
                linePositions[bufferIndex + 5] = positions[targetStride + 2]

                for (let offset = 0; offset < 2; offset += 1) {
                    const colorStride = offset === 0 ? sourceStride : targetStride
                    const colorIndex = bufferIndex + offset * 3
                    lineColors[colorIndex] = colors[colorStride] * opacity
                    lineColors[colorIndex + 1] = colors[colorStride + 1] * opacity
                    lineColors[colorIndex + 2] = colors[colorStride + 2] * opacity
                }

                segmentIndex += 1
                connections += 1
            }
        }

        // Update existing attributes — never create new BufferAttribute per frame
        pointPosAttrRef.current.needsUpdate = true
        pointColAttrRef.current!.needsUpdate = true

        linePosAttrRef.current.needsUpdate = true
        lineColAttrRef.current!.needsUpdate = true
        linesRef.current.geometry.setDrawRange(0, segmentIndex * 2)
        linesRef.current.geometry.computeBoundingSphere()
    })

    const pointSize = reducedMotion ? 0.018 : 0.024

    return (
        <>
            <points ref={pointsRef}>
                <bufferGeometry />
                <pointsMaterial
                    size={pointSize}
                    sizeAttenuation
                    vertexColors
                    transparent
                    opacity={reducedMotion ? 0.5 : 0.72}
                    depthWrite={false}
                />
            </points>

            <lineSegments ref={linesRef}>
                <bufferGeometry />
                <lineBasicMaterial vertexColors transparent opacity={0.22} depthWrite={false} />
            </lineSegments>
        </>
    )
}

export default function ParticleField({ reducedMotion = false }: ParticleFieldProps) {
    const particleCount = typeof window !== "undefined" && window.innerWidth < 768 ? 800 : 2000

    return (
        <Canvas
            className="h-full w-full"
            camera={{ position: [0, 0, 2.8], fov: 52 }}
            dpr={[1, 1.5]}
            gl={{ antialias: false, alpha: true, powerPreference: "high-performance" }}
        >
            <color attach="background" args={["#000000"]} />
            <fog attach="fog" args={["#05070a", 1.5, 6]} />
            <SceneParticles count={particleCount} reducedMotion={reducedMotion} />
        </Canvas>
    )
}
