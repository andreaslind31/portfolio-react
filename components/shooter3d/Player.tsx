"use client";

import { useRef, useEffect, useCallback } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { RigidBody, CapsuleCollider } from "@react-three/rapier";
import type { RapierRigidBody } from "@react-three/rapier";
import * as THREE from "three";

interface PlayerProps {
  locked: boolean;
}

const SPEED = 7;
const JUMP_FORCE = 5;
const MOUSE_SENSITIVITY = 0.002;

export default function Player({ locked }: PlayerProps) {
  const rigidBodyRef = useRef<RapierRigidBody>(null);
  const { camera } = useThree();

  // Movement state stored in refs to avoid re-renders
  const keys = useRef<Set<string>>(new Set());
  const euler = useRef(new THREE.Euler(0, 0, 0, "YXZ"));

  // Set initial camera position
  useEffect(() => {
    camera.position.set(0, 2, 5);
    euler.current.y = Math.PI; // Face into the arena
  }, [camera]);

  // Keyboard handlers
  const onKeyDown = useCallback((e: KeyboardEvent) => {
    keys.current.add(e.code);
  }, []);

  const onKeyUp = useCallback((e: KeyboardEvent) => {
    keys.current.delete(e.code);
  }, []);

  // Mouse look handler
  const onMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!locked) return;
      euler.current.y -= e.movementX * MOUSE_SENSITIVITY;
      euler.current.x -= e.movementY * MOUSE_SENSITIVITY;
      euler.current.x = Math.max(
        -Math.PI / 2.5,
        Math.min(Math.PI / 2.5, euler.current.x)
      );
    },
    [locked]
  );

  useEffect(() => {
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [onKeyDown, onKeyUp, onMouseMove]);

  useFrame(() => {
    if (!rigidBodyRef.current || !locked) return;

    const body = rigidBodyRef.current;

    // Apply camera rotation
    camera.quaternion.setFromEuler(euler.current);

    // Movement direction relative to camera
    const forward = new THREE.Vector3(0, 0, -1);
    forward.applyQuaternion(
      new THREE.Quaternion().setFromAxisAngle(
        new THREE.Vector3(0, 1, 0),
        euler.current.y
      )
    );
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    const moveDir = new THREE.Vector3();

    if (keys.current.has("KeyW") || keys.current.has("ArrowUp"))
      moveDir.add(forward);
    if (keys.current.has("KeyS") || keys.current.has("ArrowDown"))
      moveDir.sub(forward);
    if (keys.current.has("KeyD") || keys.current.has("ArrowRight"))
      moveDir.add(right);
    if (keys.current.has("KeyA") || keys.current.has("ArrowLeft"))
      moveDir.sub(right);

    if (moveDir.length() > 0) moveDir.normalize();

    // Get current velocity and update horizontal movement
    const currentVel = body.linvel();
    body.setLinvel(
      {
        x: moveDir.x * SPEED,
        y: currentVel.y,
        z: moveDir.z * SPEED,
      },
      true
    );

    // Ground check: vertical velocity near zero (works on ramps too)
    const pos = body.translation();
    const isGrounded = pos.y < 3.5 && Math.abs(currentVel.y) < 0.5;

    if (
      (keys.current.has("Space") || keys.current.has("KeySpace")) &&
      isGrounded
    ) {
      body.setLinvel(
        {
          x: currentVel.x,
          y: JUMP_FORCE,
          z: currentVel.z,
        },
        true
      );
    }

    // Sync camera to rigid body position
    camera.position.set(pos.x, pos.y + 0.5, pos.z);
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={[0, 2, 5]}
      enabledRotations={[false, false, false]}
      mass={1}
      linearDamping={0.5}
      colliders={false}
      type="dynamic"
    >
      <CapsuleCollider args={[0.5, 0.3]} position={[0, 0, 0]} />
    </RigidBody>
  );
}
