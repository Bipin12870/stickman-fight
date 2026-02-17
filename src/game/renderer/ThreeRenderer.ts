import * as THREE from 'three';

export class ThreeRenderer {
    private scene: THREE.Scene;
    private camera: THREE.OrthographicCamera;
    private renderer: THREE.WebGLRenderer;
    private canvas: HTMLCanvasElement;

    constructor(canvas: HTMLCanvasElement) {
        this.canvas = canvas;

        // Create scene
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent background to show 2D arena underneath

        // Create orthographic camera for 2D-style view (no perspective distortion)
        const aspect = canvas.width / canvas.height;
        const frustumSize = 400; // Adjust this to control zoom level
        this.camera = new THREE.OrthographicCamera(
            frustumSize * aspect / -2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            frustumSize / -2,
            0.1,
            1000
        );
        this.camera.position.set(0, 0, 10);
        this.camera.lookAt(0, 0, 0);

        // Create WebGL renderer
        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true, // Enable transparency
            antialias: true
        });
        this.renderer.setSize(canvas.width, canvas.height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // Set up lighting
        this.setupLighting();
    }

    private setupLighting() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light for character definition
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 7);
        directionalLight.castShadow = true;
        directionalLight.shadow.camera.left = -10;
        directionalLight.shadow.camera.right = 10;
        directionalLight.shadow.camera.top = 10;
        directionalLight.shadow.camera.bottom = -10;
        this.scene.add(directionalLight);

        // Rim light for neon outline effect (cyan)
        const rimLight = new THREE.DirectionalLight(0x00ffff, 0.5);
        rimLight.position.set(-5, 5, -5);
        this.scene.add(rimLight);

        // Add a shadow plane
        const planeGeometry = new THREE.PlaneGeometry(100, 100);
        const planeMaterial = new THREE.ShadowMaterial({ opacity: 0.3 });
        const plane = new THREE.Mesh(planeGeometry, planeMaterial);
        plane.rotation.x = -Math.PI / 2;
        plane.position.y = -2;
        plane.receiveShadow = true;
        this.scene.add(plane);
    }

    public getScene(): THREE.Scene {
        return this.scene;
    }

    public getCamera(): THREE.OrthographicCamera {
        return this.camera;
    }

    public render() {
        this.renderer.render(this.scene, this.camera);
    }

    public resize(width: number, height: number) {
        const aspect = width / height;
        const frustumSize = 400;

        this.camera.left = frustumSize * aspect / -2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = frustumSize / -2;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    public dispose() {
        this.renderer.dispose();
    }
}
