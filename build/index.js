
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; r.crossOrigin='anonymous'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const ANGLE_TRANSITION_RATE = Math.PI * 2; // per second
const ANIM_TRANSITION_TIME = 0.2;
const TWO_PI = Math.PI * 2;
function normalizeAngle(angle) {
    while (angle < 0)
        angle += TWO_PI;
    while (angle >= TWO_PI)
        angle -= TWO_PI;
    return angle;
}
class Model {
    desc;
    gltf;
    mixer;
    actions = [];
    currentAction;
    rotation = 0;
    currentRotation = 0;
    processedTime = 0;
    currentTime = 0;
    dest;
    onArrival;
    constructor(desc, gltf) {
        this.desc = desc;
        this.gltf = gltf;
        this.mixer = new THREE.AnimationMixer(gltf.scene);
        for (const anim of gltf.animations) {
            const action = this.mixer.clipAction(anim);
            this.actions.push(action);
        }
    }
    getPos() {
        return new THREE.Vector2(this.gltf.scene.position.x, this.gltf.scene.position.z);
    }
    tick(dt) {
        this.mixer.update(dt);
        this.currentTime += dt;
        const STATIC_DT = 1 / 60;
        while (this.currentTime - this.processedTime >= 0) {
            this.processedTime += STATIC_DT;
            let movementSpeed = 0;
            const currentClipName = this.currentAction?.getClip().name;
            if (currentClipName?.startsWith("Run")) {
                movementSpeed = this.desc.runSpeed;
            }
            else if (currentClipName?.startsWith("Walk")) {
                movementSpeed = this.desc.walkSpeed;
            }
            const movement = (movementSpeed / 100) * STATIC_DT;
            if (movement > 0) {
                const delta = new THREE.Vector3(0, 0, movement);
                delta.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
                this.gltf.scene.position.add(delta);
            }
            if (this.currentRotation !== this.rotation) {
                const currentAngle = normalizeAngle(this.currentRotation);
                const targetAngle = normalizeAngle(this.rotation);
                let angleDifference = targetAngle - currentAngle;
                if (angleDifference > Math.PI) {
                    angleDifference -= TWO_PI; // Go counter-clockwise
                }
                else if (angleDifference < -Math.PI) {
                    angleDifference += TWO_PI; // Go clockwise
                }
                const maxAngleChange = ANGLE_TRANSITION_RATE * STATIC_DT;
                const sign = angleDifference >= 0 ? 1 : -1;
                let newAngle;
                if (Math.abs(angleDifference) > maxAngleChange) {
                    newAngle = normalizeAngle(currentAngle + sign * maxAngleChange);
                }
                else {
                    newAngle = this.rotation;
                }
                this.currentRotation = newAngle;
                this.gltf.scene.setRotationFromAxisAngle(new THREE.Vector3(0, 1, 0), newAngle);
            }
            if (this.dest !== undefined) {
                const pos = this.getPos();
                const dist = pos.distanceTo(this.dest);
                if (movementSpeed === 0 || dist < 0.1) {
                    this.dest = undefined;
                    this.onArrival?.(this);
                }
            }
        }
    }
    show() {
        shownModels.add(this);
        scene.add(this.gltf.scene);
    }
    hide() {
        shownModels.delete(this);
        scene.remove(this.gltf.scene);
    }
    destroy() {
        const { gltf, mixer } = this;
        if (gltf.scene) {
            gltf.scene.traverse((object) => {
                if (object instanceof THREE.Mesh) {
                    object.geometry.dispose();
                    if (object.material.isMaterial) {
                        object.material.dispose();
                    }
                    else if (Array.isArray(object.material)) {
                        // In case of multi-materials
                        object.material.forEach(material => material.dispose());
                    }
                }
            });
        }
        if (mixer) {
            mixer.stopAllAction();
            this.actions.forEach(action => action.stop());
        }
    }
    play(animName) {
        const newAction = this.actions.find(a => a.getClip().name.startsWith(animName));
        if (!newAction) {
            console.warn("Animation not found:", animName);
            return;
        }
        if (this.currentAction === newAction) {
            return;
        }
        if (this.currentAction && this.currentAction !== newAction) {
            this.currentAction.fadeOut(ANIM_TRANSITION_TIME);
            newAction.reset().fadeIn(ANIM_TRANSITION_TIME).play();
        }
        else {
            newAction.reset().play();
        }
        this.currentAction = newAction;
    }
    actionTo(actionName, x, z) {
        this.dest = new THREE.Vector2(x, z);
        const pos = this.getPos();
        const angle = Math.atan2(this.dest.x - pos.x, this.dest.y - pos.y);
        this.rotation = angle;
        this.play(actionName);
    }
}
const clock = new THREE.Clock();
const renderer = new THREE.WebGLRenderer({ antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera();
const shownModels = new Set();
function setupScene() {
    scene.background = new THREE.Color(0xffffff);
    camera.fov = 50;
    camera.near = 0.1;
    camera.far = 1000;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    const handleResize = () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(window.devicePixelRatio);
        renderer.setSize(window.innerWidth, window.innerHeight);
    };
    handleResize();
    // setup basic stuff
    const ambientLight = new THREE.AmbientLight(0xebebeb);
    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(10, 10, -10);
    light.castShadow = true;
    light.shadow.mapSize.width = 4096 * 4;
    light.shadow.mapSize.height = 4096 * 4;
    light.shadow.camera.near = 0.001;
    light.shadow.camera.far = 50;
    scene.add(ambientLight, light);
    camera.position.set(1.7, 1.3, 1.3);
    camera.lookAt(new THREE.Vector3(0, 0, 0));
    const planeGeometry = new THREE.PlaneGeometry(5, 5);
    const planeMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    plane.rotateX(-Math.PI / 2);
    plane.receiveShadow = true;
    scene.add(plane);
    window.addEventListener("resize", handleResize);
    document.body.appendChild(renderer.domElement);
    requestAnimationFrame(tick);
}
function tick() {
    const timeSpeed = 1;
    requestAnimationFrame(tick);
    const dt = clock.getDelta() / timeSpeed;
    for (const model of shownModels) {
        model.tick(dt);
    }
    renderer.render(scene, camera);
}
async function loadModel(desc) {
    return new Promise((resolve, reject) => {
        const loader = new GLTFLoader();
        loader.setMeshoptDecoder(window.MeshoptDecoder);
        loader.load(`build/Models/${desc.name}.glb`, gltf => {
            // to enable shadows
            gltf.scene.traverse(node => {
                if (node instanceof THREE.Mesh) {
                    node.castShadow = true;
                }
            });
            const model = new Model(desc, gltf);
            resolve(model);
        }, undefined, reject);
    });
}

let database;
async function loadDatabase() {
    database = await (await fetch("build/database.json")).json();
}

let num = 0;
const preloadedModels = [null, null, null];
let loading = false;
function normalizeNum(num) {
    if (num < 0)
        num += database.models.length;
    if (num >= database.models.length)
        num -= database.models.length;
    return num;
}
async function showModel(direction) {
    if (loading) {
        return;
    }
    loading = true;
    // current model
    const modelToHide = preloadedModels[1];
    if (modelToHide) {
        modelToHide.hide();
    }
    num = normalizeNum(num + direction);
    if (num < 0)
        num += database.models.length;
    if (num >= database.models.length)
        num -= database.models.length;
    localStorage.setItem("num", num.toString());
    let preloadPromise = null;
    let modelToUnload = null;
    if (direction === 1) {
        modelToUnload = preloadedModels.shift() ?? null;
        if (modelToUnload) {
            modelToUnload.destroy();
        }
        // allocate next
        preloadedModels.push(null);
        const nextDesc = database.models[normalizeNum(num + 1)];
        preloadPromise = loadModel(nextDesc).then(nextModel => {
            preloadedModels[2] = nextModel;
        });
    }
    else if (direction === -1) {
        modelToUnload = preloadedModels.pop() ?? null;
        // allocate prev
        preloadedModels.unshift(null);
        const nextDesc = database.models[normalizeNum(num - 1)];
        preloadPromise = loadModel(nextDesc).then(prevModel => {
            preloadedModels[0] = prevModel;
        });
    }
    if (modelToUnload) {
        modelToUnload.destroy();
    }
    let modelToShow = preloadedModels[1];
    if (!modelToShow) {
        const desc = database.models[num];
        modelToShow = await loadModel(desc);
        preloadedModels[1] = modelToShow;
    }
    modelToShow.play("Wait");
    modelToShow.show();
    let agitated = false;
    function action() {
        modelToShow.play(agitated ? "AtkWait" : "Wait");
        setTimeout(() => {
            if (Math.random() < 0.5) {
                agitated = !agitated;
            }
            // eslint-disable-next-line no-constant-condition
            while (true) {
                const newPos = new THREE.Vector2(-2 + Math.random() * 4, -2 + Math.random() * 4);
                const currentPos = modelToShow.getPos();
                if (newPos.distanceTo(currentPos) > 1) {
                    modelToShow.actionTo(agitated ? "Run" : "Walk", newPos.x, newPos.y);
                    break;
                }
            }
        }, 1000);
    }
    modelToShow.onArrival = action;
    action();
    if (preloadPromise) {
        await preloadPromise;
    }
    loading = false;
}
async function main() {
    // TODO show loader
    await loadDatabase();
    setupScene();
    num = parseInt(localStorage.getItem("num") ?? "0");
    showModel(0);
    document.body.onkeydown = async (e) => {
        if (e.key === "PageDown") {
            showModel(1);
        }
        else if (e.key === "PageUp") {
            showModel(-1);
        }
    };
}
main();
//# sourceMappingURL=index.js.map
