import * as THREE from 'three';
import { GLTFLoader } from 'GLTFLoader';
import { OrbitControls } from 'OrbitControls';
import { RGBELoader } from 'RGBELoader';
import { VRButton } from 'VRButton';

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setClearColor(0x000000, 0); // Transparent clear color
renderer.gammaOutput = true; // Ensures that textures and colors are gamma-corrected
renderer.gammaFactor = 2.2; // Standard gamma correction
renderer.outputEncoding = THREE.sRGBEncoding; // Better color accuracy
document.body.appendChild(renderer.domElement);
// Check for WebXR support
if (navigator.xr) {
    navigator.xr.isSessionSupported('immersive-vr').then((supported) => {
        if (supported) {
            // WebXR is supported, so we add the VRButton to the document
            document.body.appendChild(VRButton.createButton(renderer));
            renderer.xr.enabled = true;
        } else {
            // WebXR is not supported, so we can choose to hide or not add the VR button,
            // or display some alternative content or message to the user.
        }
    });
} else {
    // navigator.xr does not exist, indicating that WebXR is definitely not supported
}

renderer.domElement.style.background = 'linear-gradient(180deg, #333333 0%, #000000 100%)';

new RGBELoader()
    .load('./assets/moonlit_golf_4k.hdr', function(texture) {
        console.log("HDR Loaded Successfully");
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture;
    }, undefined, function (error) {
        console.error("Error loading HDR:", error);
    });

// General lighting that applies to the whole scene
const ambientLight = new THREE.AmbientLight(0xffffff, 1);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
directionalLight.position.set(1, 1, 0).normalize();
scene.add(directionalLight);

const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(1, 2, 2);
scene.add(pointLight);

const pointLight2 = new THREE.PointLight(0xffffff, 1, 100);
pointLight2.position.set(-2, 4, 4);
scene.add(pointLight2);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
camera.position.set(0, 1, 10);
controls.update();

// Particles System
function hslToRgb(h, s, l) {
    let r, g, b;

    if (s == 0) {
        r = g = b = l; // achromatic
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };

        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }

    return [r * 255, g * 255, b * 255];
}

// Particles
// Load the particle texture
const particleTexture = new THREE.TextureLoader().load('../assets/fire.png', () => {
    // Once the texture has loaded, calculate the aspect ratio
    const textureAspectRatio = particleTexture.width / particleTexture.height;

    // Adjust the size of the particles based on the aspect ratio
    particleMaterial.size *= textureAspectRatio;
});

// Particles Material
const particleMaterial = new THREE.PointsMaterial({
    size: 2,
    vertexColors: true,
    map: particleTexture,
    blending: THREE.AdditiveBlending,
    transparent: true
});

const particles = new THREE.BufferGeometry();
const count = 5000;
const positions = new Float32Array(count * 3);
const colors = new Float32Array(count * 3);

for (let i = 0; i < count * 3; i += 3) {
    positions[i] = THREE.MathUtils.randFloatSpread(300); // Increased spread for x
    positions[i + 1] = THREE.MathUtils.randFloatSpread(300); // Increased spread for y
    positions[i + 2] = THREE.MathUtils.randFloatSpread(300); // Increased spread for z

    // Constrain hue to fire colors (red to yellow)
    const hue = Math.random() * (60 - 0) + 0; // Hues from 0 (red) to 60 (yellow)
    const saturation = 1; // Full saturation for vibrant colors
    // Adjust lightness randomly for varied brightness levels
    const lightness = 0 + Math.random() * 0.5; // Range for variation
    const [r, g, b] = hslToRgb(hue / 360, saturation, lightness); // Convert hue to [0, 1] range

    colors[i] = r / 255;
    colors[i + 1] = g / 255;
    colors[i + 2] = b / 255;
}

particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));

// Put it together
const particleSystem = new THREE.Points(particles, particleMaterial);
scene.add(particleSystem);


// Define the animate function before it's used
function animate() {
    requestAnimationFrame(animate);

    updateFlicker(); // Apply the flickering effect

    controls.update();
    renderer.render(scene, camera);
}

// Now we can safely reference 'animate' without causing a ReferenceError
const loader = new GLTFLoader();
loader.load(
    '../assets/scene.gltf',
    function (gltf) {
        // Set some ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 1); // Increased intensity
        scene.add(ambientLight);

        // The model
        const model = gltf.scene;
        scene.add(model);
        model.scale.set(5, 5, 5);
        model.position.set(0, -6.5, 0);

        // Calculate the bounding box of the model
        const bbox = new THREE.Box3().setFromObject(model);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        // Directional light
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1); // Increased intensity
        directionalLight.position.set(0, 2, 2); // Adjust position to better illuminate the model
        scene.add(directionalLight);

        // Position the light in front of the model
        const frontLight = new THREE.DirectionalLight(0xffffff, 0.5);
        const modelFront = new THREE.Vector3();
        // Get the model's front (assuming the model's front faces the positive Z direction)
        modelFront.setFromMatrixPosition(model.matrixWorld).add(new THREE.Vector3(0, 0, 10));
        frontLight.position.copy(modelFront);
        scene.add(frontLight);

        // Adjust particle positions to surround the model
        adjustParticlePositions(particles, model, window.innerWidth, window.innerHeight);

        animate(); // Call 'animate' after the model is added to the scene

    },
    undefined,
    function (error) {
        console.error('An error happened', error);
    }
);

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    // Optionally, reapply the scale calculation here if you want dynamic resizing
});

function adjustParticlePositions(particlesGeometry, model) {
    const bbox = new THREE.Box3().setFromObject(model);
    bbox.expandByScalar(1.5); // Optional, adjust or remove based on desired proximity
    const center = bbox.getCenter(new THREE.Vector3());
    const size = bbox.getSize(new THREE.Vector3());

    const positions = particlesGeometry.attributes.position.array;
    for (let i = 0; i < positions.length; i += 3) {
        let x, y, z;
        // Keep generating random positions until they meet our criteria
        do {
            x = THREE.MathUtils.randFloatSpread(200); // Maintain wider spread for randomness
            y = THREE.MathUtils.randFloatSpread(200);
            z = THREE.MathUtils.randFloatSpread(200);

            // Condition to check if the position is to the left or right of the model
            // Adjust the condition as needed based on your model's orientation and scene setup
        } while (Math.abs(x - center.x) < size.x / 2 + 10 || bbox.containsPoint(new THREE.Vector3(x, y, z)));
        // The condition ensures particles are not directly in front of or behind the model
        // by checking if they're beyond a minimal `x` distance from the model's center

        positions[i] = x;
        positions[i + 1] = y;
        positions[i + 2] = z;
    }

    particlesGeometry.attributes.position.needsUpdate = true;
}

function updateFlicker() {
    // Oscillate size between a small range, e.g., 1.8 to 2.2
    const sizeOscillation = 0.2 * Math.sin(Date.now() * 0.005);
    particleMaterial.size = 2 + sizeOscillation;

    // Randomly adjust opacity to simulate the varying intensity of a candle flame
    // The opacity fluctuates more subtly, between 0.7 and 1 for example
    const opacityFluctuation = 0.3 * (0.5 - Math.random());
    particleMaterial.opacity = 0.85 + opacityFluctuation;
}
