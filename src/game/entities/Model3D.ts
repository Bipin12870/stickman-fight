import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

export class Model3D {
    private model: THREE.Group | null = null;
    private mixer: THREE.AnimationMixer | null = null;
    private bones: Map<string, THREE.Bone> = new Map();
    private isLoaded: boolean = false;

    constructor() { }

    public async load(path: string): Promise<void> {
        const loader = new GLTFLoader();

        return new Promise((resolve, reject) => {
            loader.load(
                path,
                (gltf) => {
                    this.model = gltf.scene;
                    this.model.castShadow = true;
                    this.model.receiveShadow = true;

                    // Enable shadows for all meshes
                    this.model.traverse((child) => {
                        if (child instanceof THREE.Mesh) {
                            child.castShadow = true;
                            child.receiveShadow = true;
                        }
                    });

                    // Set up animation mixer if animations exist
                    if (gltf.animations && gltf.animations.length > 0) {
                        this.mixer = new THREE.AnimationMixer(this.model);
                    }

                    // Index all bones for easy access
                    this.indexBones();

                    this.isLoaded = true;
                    resolve();
                },
                undefined,
                (error) => {
                    console.error('Error loading GLB model:', error);
                    reject(error);
                }
            );
        });
    }

    private indexBones() {
        if (!this.model) return;

        this.model.traverse((child) => {
            if (child instanceof THREE.Bone) {
                this.bones.set(child.name, child);
            }
        });

        console.log(`[Model3D] Indexed ${this.bones.size} bones:`, Array.from(this.bones.keys()));
    }

    public getBone(name: string): THREE.Bone | undefined {
        return this.bones.get(name);
    }

    public getAllBoneNames(): string[] {
        return Array.from(this.bones.keys());
    }

    public getModel(): THREE.Group | null {
        return this.model;
    }

    public isModelLoaded(): boolean {
        return this.isLoaded;
    }

    public setPosition(x: number, y: number, z: number) {
        if (this.model) {
            this.model.position.set(x, y, z);
        }
    }

    public setRotation(x: number, y: number, z: number) {
        if (this.model) {
            this.model.rotation.set(x, y, z);
        }
    }

    public setScale(scale: number) {
        if (this.model) {
            this.model.scale.set(scale, scale, scale);
        }
    }

    public update(delta: number) {
        if (this.mixer) {
            this.mixer.update(delta);
        }
    }

    public dispose() {
        if (this.model) {
            this.model.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                    child.geometry.dispose();
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
    }
}
