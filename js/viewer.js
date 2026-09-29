import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { STLLoader } from "three/addons/loaders/STLLoader.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export function mountViewer(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#050505");

  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100);
  camera.position.set(3.2, 1.6, 4.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.domElement.style.touchAction = "none";
  container.prepend(renderer.domElement);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enablePan = false;
  controls.enableDamping = !still;
  controls.autoRotate = !still;
  controls.autoRotateSpeed = 0.7;
  controls.addEventListener("start", () => {
    controls.autoRotate = false;
  });

  scene.add(new THREE.HemisphereLight(0xf4efe4, 0x3a342c, 0.9));
  const key = new THREE.DirectionalLight(0xfff6ea, 1.25);
  key.position.set(4, 7, 5);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xd5e0f2, 0.75);
  rim.position.set(-5, 2, -4);
  scene.add(rim);

  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowMap(), transparent: true, depthWrite: false })
  );
  shadow.rotation.x = -Math.PI / 2;
  scene.add(shadow);

  const material = new THREE.MeshStandardMaterial({
    color: "#c8c2b8",
    roughness: 0.62,
    metalness: 0.04,
  });

  let current = null;

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h, false);
  }

  const observer = new ResizeObserver(resize);
  observer.observe(container);
  resize();

  renderer.setAnimationLoop(() => {
    controls.update();
    renderer.render(scene, camera);
  });

  function clear() {
    if (!current) return;
    scene.remove(current);
    current.traverse((obj) => {
      if (obj.geometry) obj.geometry.dispose();
    });
    current = null;
  }

  function place(object) {
    clear();
    current = object;
    scene.add(object);
    object.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(object);
    const center = box.getCenter(new THREE.Vector3());
    object.position.sub(center);
    object.updateMatrixWorld(true);
    const fitted = new THREE.Box3().setFromObject(object);
    const size = fitted.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    shadow.scale.set(maxDim * 1.7, maxDim * 1.7, 1);
    shadow.position.y = fitted.min.y + maxDim * 0.01;
    const dist = maxDim / 2 / Math.tan((camera.fov * Math.PI) / 360);
    camera.position.set(dist * 0.9, dist * 0.42, dist * 1.25);
    camera.near = Math.max(maxDim / 200, 0.01);
    camera.far = maxDim * 30;
    camera.updateProjectionMatrix();
    controls.target.set(0, 0, 0);
    controls.minDistance = maxDim * 0.6;
    controls.maxDistance = maxDim * 6;
    controls.update();
    container.classList.add("is-live");
  }

  function setColor(hex) {
    material.color.set(hex || "#c8c2b8");
  }

  function showKind(kind, color) {
    setColor(color);
    if (kind === "clip") place(clip(material));
    else if (kind === "cap") place(cap(material));
    else place(jug(material));
  }

  function showBuffer(buffer, ext, color) {
    setColor(color);
    const type = String(ext || "").toLowerCase();
    if (type === "stl") {
      const geo = new STLLoader().parse(buffer);
      const mesh = new THREE.Mesh(geo, material);
      mesh.rotation.x = -Math.PI / 2;
      place(mesh);
      return;
    }
    if (type === "obj") {
      const text = new TextDecoder().decode(buffer);
      const obj = new OBJLoader().parse(text);
      obj.traverse((child) => {
        if (child.isMesh) child.material = material;
      });
      place(obj);
      return;
    }
    throw new Error("Use an STL or OBJ file.");
  }

  return { showKind, showBuffer, setColor };
}

function shadowMap() {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext("2d");
  const grad = g.createRadialGradient(64, 64, 8, 64, 64, 64);
  grad.addColorStop(0, "rgba(0,0,0,0.45)");
  grad.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  return new THREE.CanvasTexture(canvas);
}

function jug(material) {
  const group = new THREE.Group();
  const points = [
    new THREE.Vector2(0.02, 0),
    new THREE.Vector2(0.62, 0.02),
    new THREE.Vector2(0.7, 0.16),
    new THREE.Vector2(0.64, 1.05),
    new THREE.Vector2(0.46, 1.38),
    new THREE.Vector2(0.3, 1.58),
    new THREE.Vector2(0.36, 1.74),
    new THREE.Vector2(0.2, 1.8),
  ];
  const body = new THREE.Mesh(new THREE.LatheGeometry(points, 56), material);
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.075, 18, 48, Math.PI * 1.25), material);
  handle.position.set(0.62, 0.95, 0);
  handle.rotation.z = -0.35;
  group.add(body, handle);
  return group;
}

function clip(material) {
  const group = new THREE.Group();
  const base = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.16, 0.72), material);
  base.position.y = 0.08;
  const wall = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.95, 0.72), material);
  wall.position.set(-0.87, 0.55, 0);
  const lip = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.14, 0.72), material);
  lip.position.set(-0.52, 0.98, 0);
  group.add(base, wall, lip);
  return group;
}

function cap(material) {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.7, 0.95, 48), material);
  body.position.y = 0.2;
  const flange = new THREE.Mesh(new THREE.CylinderGeometry(1.02, 1.02, 0.14, 48), material);
  flange.position.y = -0.28;
  group.add(body, flange);
  return group;
}
