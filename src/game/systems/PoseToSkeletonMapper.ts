import * as THREE from 'three';
import type { Landmark } from '../entities/Stickman';

/**
 * Maps MediaPipe Pose landmarks to 3D model bones
 * MediaPipe provides 33 landmarks, we map key ones to humanoid skeleton
 */
export class PoseToSkeletonMapper {
    // MediaPipe landmark indices
    private static readonly LANDMARKS = {
        NOSE: 0,
        LEFT_EYE: 2,
        RIGHT_EYE: 5,
        LEFT_SHOULDER: 11,
        RIGHT_SHOULDER: 12,
        LEFT_ELBOW: 13,
        RIGHT_ELBOW: 14,
        LEFT_WRIST: 15,
        RIGHT_WRIST: 16,
        LEFT_HIP: 23,
        RIGHT_HIP: 24,
        LEFT_KNEE: 25,
        RIGHT_KNEE: 26,
        LEFT_ANKLE: 27,
        RIGHT_ANKLE: 28
    };

    /**
     * Apply MediaPipe landmarks to a 3D model's skeleton
     */
    public static applyPoseToSkeleton(
        landmarks: Landmark[],
        bones: Map<string, THREE.Bone>
    ): void {
        if (landmarks.length === 0) return;

        // Map landmarks to bone rotations
        // Note: This is a simplified mapping. Real IK would be more complex.

        // Head rotation (based on nose and eyes)
        this.applyHeadRotation(landmarks, bones);

        // Arm rotations
        this.applyArmRotation(landmarks, bones, 'Left');
        this.applyArmRotation(landmarks, bones, 'Right');

        // Leg rotations
        this.applyLegRotation(landmarks, bones, 'Left');
        this.applyLegRotation(landmarks, bones, 'Right');
    }

    private static applyHeadRotation(landmarks: Landmark[], bones: Map<string, THREE.Bone>) {
        const head = bones.get('Head') || bones.get('head') || bones.get('mixamorig:Head');
        if (!head) return;

        const nose = landmarks[this.LANDMARKS.NOSE];
        const leftEye = landmarks[this.LANDMARKS.LEFT_EYE];
        const rightEye = landmarks[this.LANDMARKS.RIGHT_EYE];

        // Calculate head tilt based on eye positions
        const eyeMidX = (leftEye.x + rightEye.x) / 2;
        const eyeMidY = (leftEye.y + rightEye.y) / 2;

        // Simple rotation based on nose position relative to eyes
        const tiltX = (nose.y - eyeMidY) * 2; // Pitch
        const tiltY = (nose.x - eyeMidX) * 2; // Yaw

        head.rotation.x = tiltX;
        head.rotation.y = tiltY;
    }

    private static applyArmRotation(
        landmarks: Landmark[],
        bones: Map<string, THREE.Bone>,
        side: 'Left' | 'Right'
    ) {
        const shoulderKey = side === 'Left' ? this.LANDMARKS.LEFT_SHOULDER : this.LANDMARKS.RIGHT_SHOULDER;
        const elbowKey = side === 'Left' ? this.LANDMARKS.LEFT_ELBOW : this.LANDMARKS.RIGHT_ELBOW;
        const wristKey = side === 'Left' ? this.LANDMARKS.LEFT_WRIST : this.LANDMARKS.RIGHT_WRIST;

        const shoulder = landmarks[shoulderKey];
        const elbow = landmarks[elbowKey];
        const wrist = landmarks[wristKey];

        // Try different naming conventions for bones
        const upperArmBone =
            bones.get(`${side}Arm`) ||
            bones.get(`${side}UpperArm`) ||
            bones.get(`mixamorig:${side}Arm`);

        const forearmBone =
            bones.get(`${side}ForeArm`) ||
            bones.get(`${side}Forearm`) ||
            bones.get(`mixamorig:${side}ForeArm`);

        if (upperArmBone) {
            // Calculate angle from shoulder to elbow
            const angle = Math.atan2(elbow.y - shoulder.y, elbow.x - shoulder.x);
            upperArmBone.rotation.z = angle;
        }

        if (forearmBone) {
            // Calculate angle from elbow to wrist
            const angle = Math.atan2(wrist.y - elbow.y, wrist.x - elbow.x);
            forearmBone.rotation.z = angle;
        }
    }

    private static applyLegRotation(
        landmarks: Landmark[],
        bones: Map<string, THREE.Bone>,
        side: 'Left' | 'Right'
    ) {
        const hipKey = side === 'Left' ? this.LANDMARKS.LEFT_HIP : this.LANDMARKS.RIGHT_HIP;
        const kneeKey = side === 'Left' ? this.LANDMARKS.LEFT_KNEE : this.LANDMARKS.RIGHT_KNEE;
        const ankleKey = side === 'Left' ? this.LANDMARKS.LEFT_ANKLE : this.LANDMARKS.RIGHT_ANKLE;

        const hip = landmarks[hipKey];
        const knee = landmarks[kneeKey];
        const ankle = landmarks[ankleKey];

        // Try different naming conventions
        const upperLegBone =
            bones.get(`${side}UpLeg`) ||
            bones.get(`${side}Thigh`) ||
            bones.get(`mixamorig:${side}UpLeg`);

        const lowerLegBone =
            bones.get(`${side}Leg`) ||
            bones.get(`${side}Shin`) ||
            bones.get(`mixamorig:${side}Leg`);

        if (upperLegBone) {
            const angle = Math.atan2(knee.y - hip.y, knee.x - hip.x);
            upperLegBone.rotation.z = angle;
        }

        if (lowerLegBone) {
            const angle = Math.atan2(ankle.y - knee.y, knee.x - knee.x);
            lowerLegBone.rotation.z = angle;
        }
    }

    /**
     * Get the center position of the pose (for positioning the model)
     */
    public static getPoseCenter(landmarks: Landmark[]): { x: number; y: number } {
        if (landmarks.length === 0) return { x: 0.5, y: 0.5 };

        const leftHip = landmarks[this.LANDMARKS.LEFT_HIP];
        const rightHip = landmarks[this.LANDMARKS.RIGHT_HIP];

        return {
            x: (leftHip.x + rightHip.x) / 2,
            y: (leftHip.y + rightHip.y) / 2
        };
    }
}
