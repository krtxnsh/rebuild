import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { ChevronDown, ChevronUp, Compass, Eye, Sun } from 'lucide-react';
import { VillageBuilding } from '../../types/palampur';

export type VillageTimeOfDay = 'dawn' | 'midday' | 'dusk';

interface PalampurVillageCanvasProps {
  buildings: VillageBuilding[];
  mode: 'story' | 'interactive' | 'preview';
  scrollProgress?: number; // 0 to 1 in story mode
  selectedBuildingId?: string | null;
  onSelectBuilding?: (buildingId: string) => void;
  className?: string;
  showDock?: boolean;
}

// Pre-allocated math helpers outside render loop (zero GC)
const _targetPos = new THREE.Vector3();
const _targetLook = new THREE.Vector3();
const _currentLook = new THREE.Vector3(0, 1.2, 0);
const _rayMouse = new THREE.Vector2();
const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyScale = new THREE.Vector3();
const _dummyColor = new THREE.Color();

function groundHeightAt(x: number, z: number): number {
  // Gentle valley bowl: flat village courtyard near center, rising into foothills north (-Z) and flanks
  const r = Math.sqrt(x * x + z * z);
  const courtyardFlat = Math.max(0, r - 6.8);
  const hillRise = Math.pow(courtyardFlat * 0.14, 1.55);
  const northSlope = z < -5 ? Math.pow((-5 - z) * 0.18, 1.45) : 0;
  const ripple = Math.sin(x * 0.35) * Math.cos(z * 0.35) * 0.08 * Math.min(1, courtyardFlat / 4);
  return hillRise + northSlope + ripple;
}

function createProceduralGrainTexture(
  baseHex: string,
  accentHex: string,
  mode: 'stone' | 'timber' | 'grass' | 'slate',
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = accentHex;
    if (mode === 'timber') {
      for (let y = 0; y < 256; y += 16) {
        ctx.globalAlpha = 0.12 + ((y * 7) % 10) * 0.015;
        ctx.fillRect(0, y, 256, 3);
      }
    } else if (mode === 'slate') {
      for (let y = 0; y < 256; y += 24) {
        ctx.globalAlpha = 0.16;
        ctx.fillRect(0, y, 256, 2);
        const offset = (y / 24) % 2 === 0 ? 0 : 16;
        for (let x = offset; x < 256; x += 32) {
          ctx.fillRect(x, y, 2, 24);
        }
      }
    } else if (mode === 'stone') {
      for (let i = 0; i < 180; i++) {
        ctx.globalAlpha = 0.08 + (i % 5) * 0.025;
        const rx = (i * 53) % 240;
        const ry = (i * 97) % 240;
        ctx.fillRect(rx, ry, 14 + (i % 12), 10 + (i % 8));
      }
    } else {
      for (let i = 0; i < 320; i++) {
        ctx.globalAlpha = 0.09 + (i % 4) * 0.02;
        const rx = (i * 71) % 252;
        const ry = (i * 43) % 252;
        ctx.fillRect(rx, ry, 4, 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.repeat.set(3, 3);
  return tex;
}

const CAMERA_PRESETS: Record<
  string,
  { label: string; pos: [number, number, number]; target: [number, number, number] }
> = {
  panorama: { label: 'Panorama', pos: [14.5, 10.5, 16.5], target: [0, 1.0, -0.5] },
  schoolhouse: { label: 'Schoolhouse', pos: [-9.2, 4.6, 3.2], target: [-5.5, 1.4, -2.5] },
  'water-plant': { label: 'Water Plant', pos: [10.4, 5.2, 2.5], target: [5.4, 1.2, -3.4] },
  'solar-microgrid': { label: 'Solar Ridge', pos: [10.2, 4.8, 10.4], target: [4.8, 1.1, 4.4] },
  'granary-mill': { label: 'Granary Mill', pos: [-9.5, 4.8, 10.2], target: [-4.8, 1.2, 4.6] },
  'community-hall': { label: 'Knowledge Hall', pos: [4.8, 5.0, 8.2], target: [0, 1.3, 0.8] },
};

const LIGHTING_PRESETS: Record<
  VillageTimeOfDay,
  {
    label: string;
    skyHex: number;
    fogHex: number;
    sunHex: number;
    sunInt: number;
    sunPos: [number, number, number];
    hemiSky: number;
    hemiGround: number;
    hemiInt: number;
  }
> = {
  dawn: {
    label: 'Golden Dawn',
    skyHex: 0xffe8cc,
    fogHex: 0xffe8cc,
    sunHex: 0xffb36b,
    sunInt: 2.3,
    sunPos: [18, 13, 10],
    hemiSky: 0xffe5c4,
    hemiGround: 0x6f5542,
    hemiInt: 0.9,
  },
  midday: {
    label: 'Himalayan Day',
    skyHex: 0xf7efe3,
    fogHex: 0xf7efe3,
    sunHex: 0xfff3df,
    sunInt: 2.4,
    sunPos: [12, 22, 14],
    hemiSky: 0xdbeeff,
    hemiGround: 0x7b634b,
    hemiInt: 0.95,
  },
  dusk: {
    label: 'Warm Dusk',
    skyHex: 0x3b2a24,
    fogHex: 0x3b2a24,
    sunHex: 0xe97832,
    sunInt: 1.75,
    sunPos: [-16, 8, 12],
    hemiSky: 0x9b7264,
    hemiGround: 0x2a1d17,
    hemiInt: 0.7,
  },
};

export const PalampurVillageCanvas: React.FC<PalampurVillageCanvasProps> = ({
  buildings,
  mode,
  scrollProgress = 0,
  selectedBuildingId = null,
  onSelectBuilding,
  className = '',
  showDock = true,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [contextLost, setContextLost] = useState(false);
  const [dockCollapsed, setDockCollapsed] = useState(false);
  const [activePreset, setActivePreset] = useState<string>('panorama');
  const [timeOfDay, setTimeOfDay] = useState<VillageTimeOfDay>('dawn');
  const [hoveredBuildingName, setHoveredBuildingName] = useState<string | null>(null);

  // Refs for mutable props so WebGL canvas is mounted ONCE without tearing down on React updates
  const scrollRef = useRef(scrollProgress);
  scrollRef.current = scrollProgress;
  const buildingsRef = useRef(buildings);
  buildingsRef.current = buildings;
  const selectedIdRef = useRef(selectedBuildingId);
  selectedIdRef.current = selectedBuildingId;
  const onSelectRef = useRef(onSelectBuilding);
  onSelectRef.current = onSelectBuilding;

  const cameraFlyTargetRef = useRef<{
    pos: THREE.Vector3;
    target: THREE.Vector3;
    active: boolean;
  }>({
    pos: new THREE.Vector3(14.5, 10.5, 16.5),
    target: new THREE.Vector3(0, 1.0, -0.5),
    active: false,
  });

  const lightingStateRef = useRef<VillageTimeOfDay>('dawn');
  const lightingDirtyRef = useRef(false);

  const handlePresetClick = (presetKey: string) => {
    const preset = CAMERA_PRESETS[presetKey];
    if (!preset) return;
    setActivePreset(presetKey);
    cameraFlyTargetRef.current.pos.set(...preset.pos);
    cameraFlyTargetRef.current.target.set(...preset.target);
    cameraFlyTargetRef.current.active = true;
  };

  const handleTimeClick = (tod: VillageTimeOfDay) => {
    setTimeOfDay(tod);
    lightingStateRef.current = tod;
    lightingDirtyRef.current = true;
  };

  // Fly to selected building when selected externally in interactive mode
  useEffect(() => {
    if (mode === 'interactive' && selectedBuildingId && CAMERA_PRESETS[selectedBuildingId]) {
      const preset = CAMERA_PRESETS[selectedBuildingId];
      setActivePreset(selectedBuildingId);
      cameraFlyTargetRef.current.pos.set(...preset.pos);
      cameraFlyTargetRef.current.target.set(...preset.target);
      cameraFlyTargetRef.current.active = true;
    }
  }, [selectedBuildingId, mode]);

  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Software WebGL detection per Three.js skill protocol
    const isSoftwareGl = (() => {
      try {
        const probeCanvas = document.createElement('canvas');
        const gl = probeCanvas.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = Math.max(320, container.clientWidth);
    const height = Math.max(240, container.clientHeight);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.08;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 1.5));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    const handleContextLost = (e: Event) => {
      e.preventDefault();
      setContextLost(true);
    };
    const handleContextRestored = () => {
      setContextLost(false);
    };
    renderer.domElement.addEventListener('webglcontextlost', handleContextLost);
    renderer.domElement.addEventListener('webglcontextrestored', handleContextRestored);

    const scene = new THREE.Scene();
    const initLight = LIGHTING_PRESETS.dawn;
    scene.background = new THREE.Color(initLight.skyHex);
    scene.fog = new THREE.FogExp2(initLight.fogHex, 0.017);

    // Mandatory studio environment map via RoomEnvironment
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(42, width / height, 0.2, 160);
    if (mode === 'story') {
      camera.position.set(17, 11.5, 19);
    } else if (mode === 'preview') {
      camera.position.set(13.5, 9.8, 14.5);
    } else {
      camera.position.set(14.5, 10.5, 16.5);
    }
    camera.lookAt(0, 1.0, -0.5);

    // Orbit controls for interactive/preview
    let controls: OrbitControls | null = null;
    if (mode !== 'story') {
      controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = !isSoftwareGl;
      controls.dampingFactor = 0.06;
      controls.maxPolarAngle = Math.PI / 2.25;
      controls.minPolarAngle = 0.28;
      controls.minDistance = 7;
      controls.maxDistance = 30;
      controls.enablePan = mode === 'interactive';
      controls.target.set(0, 1.0, -0.5);
      controls.addEventListener('start', () => {
        cameraFlyTargetRef.current.active = false;
      });
    }

    // 3-Point Warm/Cool Studio + Outdoor Himalayan Lighting Rig
    const hemiLight = new THREE.HemisphereLight(
      initLight.hemiSky,
      initLight.hemiGround,
      initLight.hemiInt,
    );
    hemiLight.position.set(0, 30, 0);
    scene.add(hemiLight);

    const sunLight = new THREE.DirectionalLight(initLight.sunHex, initLight.sunInt);
    sunLight.position.set(...initLight.sunPos);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.set(1024, 1024);
    sunLight.shadow.camera.near = 2;
    sunLight.shadow.camera.far = 52;
    const d = 16;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    sunLight.shadow.normalBias = 0.02;
    scene.add(sunLight);

    const rimLight = new THREE.DirectionalLight(0xffdcb8, 0.65);
    rimLight.position.set(-14, 9, -16);
    scene.add(rimLight);

    // Procedural Textures with max anisotropy
    const maxAniso = renderer.capabilities.getMaxAnisotropy();
    const grassTex = createProceduralGrainTexture('#7BA067', '#658854', 'grass');
    grassTex.anisotropy = maxAniso;
    grassTex.repeat.set(10, 10);

    const stoneTex = createProceduralGrainTexture('#D4C5B4', '#B5A18D', 'stone');
    stoneTex.anisotropy = maxAniso;

    const timberTex = createProceduralGrainTexture('#8E593B', '#6A3F27', 'timber');
    timberTex.anisotropy = maxAniso;

    const slateTex = createProceduralGrainTexture('#473B35', '#2F2622', 'slate');
    slateTex.anisotropy = maxAniso;

    const creamWallMat = new THREE.MeshStandardMaterial({
      color: 0xfff4e4,
      roughness: 0.78,
      metalness: 0.02,
    });
    const timberMat = new THREE.MeshStandardMaterial({
      map: timberTex,
      roughness: 0.72,
      metalness: 0.05,
    });
    const stoneMat = new THREE.MeshStandardMaterial({
      map: stoneTex,
      roughness: 0.88,
      metalness: 0.04,
    });
    const slateMat = new THREE.MeshStandardMaterial({
      map: slateTex,
      roughness: 0.62,
      metalness: 0.14,
    });
    const terracottaMat = new THREE.MeshStandardMaterial({
      color: 0xd96b2b,
      roughness: 0.56,
      metalness: 0.08,
    });
    const solarPanelMat = new THREE.MeshStandardMaterial({
      color: 0x1e3859,
      roughness: 0.18,
      metalness: 0.78,
    });
    const glassMat = new THREE.MeshPhysicalMaterial({
      color: 0xdcf4ff,
      roughness: 0.12,
      metalness: 0.1,
      transparent: true,
      opacity: 0.62,
      clearcoat: 1.0,
    });
    const scaffoldMat = new THREE.MeshStandardMaterial({
      color: 0xc2935b,
      roughness: 0.85,
      metalness: 0.02,
    });

    // 1. Sculpted Himalayan Valley Terrain (extending far into fog)
    const terrainGeo = new THREE.PlaneGeometry(76, 76, 68, 68);
    terrainGeo.rotateX(-Math.PI / 2);
    const posAttr = terrainGeo.attributes.position;
    const colors: number[] = [];
    const cLow = new THREE.Color('#81A26A');
    const cMid = new THREE.Color('#9BB179');
    const cHigh = new THREE.Color('#C5B59C');
    const cTmp = new THREE.Color();

    for (let i = 0; i < posAttr.count; i++) {
      const vx = posAttr.getX(i);
      const vz = posAttr.getZ(i);
      const vy = groundHeightAt(vx, vz);
      posAttr.setY(i, vy);
      const t = Math.min(1, vy / 6.5);
      if (t < 0.45) {
        cTmp.copy(cLow).lerp(cMid, t / 0.45);
      } else {
        cTmp.copy(cMid).lerp(cHigh, (t - 0.45) / 0.55);
      }
      colors.push(cTmp.r, cTmp.g, cTmp.b);
    }
    terrainGeo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    terrainGeo.computeVertexNormals();

    const terrainMat = new THREE.MeshStandardMaterial({
      map: grassTex,
      vertexColors: true,
      roughness: 0.92,
      metalness: 0.0,
    });
    const terrainMesh = new THREE.Mesh(terrainGeo, terrainMat);
    terrainMesh.receiveShadow = true;
    scene.add(terrainMesh);

    // 2. Winding Cobblestone Village Paths (raised >= 0.03 above courtyard to avoid z-fighting)
    const pathCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-6.2, 0.05, -2.5),
      new THREE.Vector3(-2.4, 0.05, -0.4),
      new THREE.Vector3(0.2, 0.05, 0.8),
      new THREE.Vector3(4.8, 0.05, 3.8),
    ]);
    const pathGeo = new THREE.TubeGeometry(pathCurve, 40, 0.42, 6, false);
    pathGeo.scale(1, 0.14, 1);
    const pathMesh = new THREE.Mesh(pathGeo, stoneMat);
    pathMesh.receiveShadow = true;
    scene.add(pathMesh);

    const crossCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4.8, 0.05, 4.4),
      new THREE.Vector3(-1.2, 0.05, 2.2),
      new THREE.Vector3(0.2, 0.05, 0.8),
      new THREE.Vector3(5.0, 0.05, -3.1),
    ]);
    const crossGeo = new THREE.TubeGeometry(crossCurve, 36, 0.36, 6, false);
    crossGeo.scale(1, 0.14, 1);
    const crossMesh = new THREE.Mesh(crossGeo, stoneMat);
    crossMesh.receiveShadow = true;
    scene.add(crossMesh);

    // Central courtyard stone plaza
    const plazaGeo = new THREE.CylinderGeometry(2.8, 3.0, 0.1, 24);
    const plazaMesh = new THREE.Mesh(plazaGeo, stoneMat);
    plazaMesh.position.set(0, 0.04, 0.8);
    plazaMesh.receiveShadow = true;
    scene.add(plazaMesh);

    // 3. Mountain Spring Stream / Reservoir
    const streamCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(7.5, 0.2, -12),
      new THREE.Vector3(6.2, 0.06, -4.5),
      new THREE.Vector3(8.5, 0.04, 1.5),
      new THREE.Vector3(11.5, 0.02, 10),
    ]);
    const streamGeo = new THREE.TubeGeometry(streamCurve, 42, 0.72, 6, false);
    streamGeo.scale(1, 0.1, 1);
    const waterMat = new THREE.MeshPhysicalMaterial({
      color: 0x4da8c4,
      roughness: 0.12,
      metalness: 0.15,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
    });
    const streamMesh = new THREE.Mesh(streamGeo, waterMat);
    streamMesh.receiveShadow = true;
    scene.add(streamMesh);

    // 4. Majestic Himalayan Mountain Peaks on Horizon
    const mountainGroup = new THREE.Group();
    const peakConfigs = [
      { x: -18, z: -26, r: 9.5, h: 16.5 },
      { x: -6, z: -29, r: 11.5, h: 20.5 },
      { x: 8, z: -28, r: 10.5, h: 18.2 },
      { x: 21, z: -25, r: 9.0, h: 15.0 },
      { x: -26, z: -16, r: 8.5, h: 12.5 },
      { x: 26, z: -15, r: 8.8, h: 13.0 },
    ];
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x7b6a60,
      roughness: 0.9,
      metalness: 0.04,
      flatShading: true,
    });
    const snowMat = new THREE.MeshStandardMaterial({
      color: 0xfff9f1,
      roughness: 0.55,
      metalness: 0.05,
      flatShading: true,
    });

    peakConfigs.forEach((pk, idx) => {
      const mGroup = new THREE.Group();
      const baseGeo = new THREE.ConeGeometry(pk.r, pk.h, 7);
      const baseMesh = new THREE.Mesh(baseGeo, rockMat);
      baseMesh.position.y = pk.h / 2 - 1.2;
      baseMesh.rotation.y = idx * 0.7;
      mGroup.add(baseMesh);

      const capGeo = new THREE.ConeGeometry(pk.r * 0.42, pk.h * 0.43, 7);
      const capMesh = new THREE.Mesh(capGeo, snowMat);
      capMesh.position.y = pk.h * 0.78 - 1.2;
      capMesh.rotation.y = idx * 0.7;
      mGroup.add(capMesh);

      mGroup.position.set(pk.x, 0, pk.z);
      mountainGroup.add(mGroup);
    });
    scene.add(mountainGroup);

    // 5. InstancedMesh Deodar Pine Trees & Boulders (> 20 identical items per skill guideline)
    const treeCount = 60;
    const trunkGeo = new THREE.CylinderGeometry(0.11, 0.16, 0.85, 6);
    trunkGeo.translate(0, 0.425, 0);
    const canopyGeo = new THREE.ConeGeometry(0.65, 1.9, 7);
    canopyGeo.translate(0, 1.55, 0);

    const trunkInst = new THREE.InstancedMesh(trunkGeo, timberMat, treeCount);
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      roughness: 0.82,
      metalness: 0.02,
      flatShading: true,
    });
    const canopyInst = new THREE.InstancedMesh(canopyGeo, canopyMat, treeCount);
    canopyInst.castShadow = true;
    canopyInst.receiveShadow = true;

    const treePositions: Array<[number, number]> = [];
    for (let i = 0; i < treeCount; i++) {
      const angle = (i / treeCount) * Math.PI * 2 + (i % 3) * 0.18;
      const radius = 9.2 + (i % 7) * 1.45;
      const tx = Math.cos(angle) * radius;
      const tz = Math.sin(angle) * radius - 1.5;
      // Skip river corridor
      if (tx > 4.5 && tx < 10.5 && tz > -8 && tz < 6) {
        treePositions.push([tx - 15, tz]);
      } else {
        treePositions.push([tx, tz]);
      }
    }

    treePositions.forEach(([tx, tz], i) => {
      const ty = groundHeightAt(tx, tz);
      const scale = 0.85 + ((i * 17) % 30) / 100; // ±15% scale variation
      _dummyPos.set(tx, ty, tz);
      _dummyQuat.setFromAxisAngle(_targetPos.set(0, 1, 0), i * 0.9);
      _dummyScale.set(scale, scale * (0.95 + (i % 3) * 0.08), scale);
      _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
      trunkInst.setMatrixAt(i, _dummyMatrix);
      canopyInst.setMatrixAt(i, _dummyMatrix);

      // Subtle tint variation across pine canopy
      const shade = i % 3 === 0 ? '#4D784E' : i % 3 === 1 ? '#5E8A58' : '#3E6542';
      _dummyColor.set(shade);
      canopyInst.setColorAt(i, _dummyColor);
    });
    trunkInst.instanceMatrix.needsUpdate = true;
    canopyInst.instanceMatrix.needsUpdate = true;
    if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
    trunkInst.computeBoundingSphere();
    canopyInst.computeBoundingSphere();
    scene.add(trunkInst);
    scene.add(canopyInst);

    // 6. Composite Multi-Part 3D Village Buildings (6 Landmarks)
    const buildingRefs: Record<
      string,
      {
        group: THREE.Group;
        scaffold: THREE.Group;
        windowMeshes: THREE.MeshStandardMaterial[];
        glowRing: THREE.Mesh;
        waterWheel?: THREE.Group;
        proxyMesh: THREE.Mesh;
      }
    > = {};
    const clickableProxies: THREE.Mesh[] = [];

    function createCompositeBuilding(b: VillageBuilding) {
      const group = new THREE.Group();
      const gy = groundHeightAt(b.position[0], b.position[2]);
      group.position.set(b.position[0], gy, b.position[2]);
      group.rotation.y = b.rotationY;

      const windowMats: THREE.MeshStandardMaterial[] = [];
      const makeWindowMat = () => {
        const wm = new THREE.MeshStandardMaterial({
          color: 0xffe4a0,
          emissive: 0xf5a34a,
          emissiveIntensity: b.progress >= 70 ? 0.65 : 0.12,
          roughness: 0.25,
          metalness: 0.1,
        });
        windowMats.push(wm);
        return wm;
      };

      // Shared stone plinth grounded at bottom-center
      const plinth = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.3, 2.2), stoneMat);
      plinth.position.y = 0.15;
      plinth.castShadow = true;
      plinth.receiveShadow = true;
      group.add(plinth);

      let waterWheel: THREE.Group | undefined;

      if (b.id === 'schoolhouse') {
        const body = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.3, 1.7), creamWallMat);
        body.position.y = 0.95;
        body.castShadow = true;
        body.receiveShadow = true;
        group.add(body);

        // Timber beams
        [-1.08, 0, 1.08].forEach((bx) => {
          const post = new THREE.Mesh(new THREE.BoxGeometry(0.12, 1.32, 1.74), timberMat);
          post.position.set(bx, 0.95, 0);
          group.add(post);
        });

        // Pitched slate roof (4-sided pyramid stretched)
        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.9, 1.05, 4), terracottaMat);
        roof.rotation.y = Math.PI / 4;
        roof.scale.set(1.05, 1, 0.85);
        roof.position.y = 2.1;
        roof.castShadow = true;
        group.add(roof);

        // Bell cupola
        const cupola = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.45, 0.42), creamWallMat);
        cupola.position.set(0, 2.55, 0);
        group.add(cupola);
        const cupolaCap = new THREE.Mesh(new THREE.ConeGeometry(0.38, 0.35, 4), slateMat);
        cupolaCap.rotation.y = Math.PI / 4;
        cupolaCap.position.set(0, 2.95, 0);
        group.add(cupolaCap);

        // Glowing windows
        [-0.55, 0.55].forEach((wx) => {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.48, 0.08), makeWindowMat());
          win.position.set(wx, 1.0, 0.86);
          group.add(win);
        });
      } else if (b.id === 'water-plant') {
        const hall = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 1.6), creamWallMat);
        hall.position.set(-0.25, 0.82, 0);
        hall.castShadow = true;
        group.add(hall);

        const hallRoof = new THREE.Mesh(new THREE.ConeGeometry(1.45, 0.7, 4), slateMat);
        hallRoof.rotation.y = Math.PI / 4;
        hallRoof.position.set(-0.25, 1.68, 0);
        hallRoof.castShadow = true;
        group.add(hallRoof);

        // Twin cylindrical filtration tanks
        [0.72, 0.72].forEach((_, i) => {
          const tank = new THREE.Mesh(
            new THREE.CylinderGeometry(0.38, 0.4, 1.45, 14),
            new THREE.MeshStandardMaterial({ color: 0xc2d5dc, roughness: 0.32, metalness: 0.45 }),
          );
          tank.position.set(0.75, 1.02, i === 0 ? -0.42 : 0.42);
          tank.castShadow = true;
          group.add(tank);

          const cap = new THREE.Mesh(
            new THREE.CylinderGeometry(0.32, 0.32, 0.08, 14),
            waterMat,
          );
          cap.position.set(0.75, 1.76, i === 0 ? -0.42 : 0.42);
          group.add(cap);
        });

        const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.4, 0.08), makeWindowMat());
        win.position.set(-0.25, 0.9, 0.81);
        group.add(win);
      } else if (b.id === 'solar-microgrid') {
        const hub = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.0, 1.3), creamWallMat);
        hub.position.set(-0.5, 0.8, 0);
        hub.castShadow = true;
        group.add(hub);

        const hubRoof = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.14, 1.45), slateMat);
        hubRoof.position.set(-0.5, 1.36, 0);
        group.add(hubRoof);

        // Angled Photovoltaic Panel Array
        const arrayStand = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.14, 0.9, 8), stoneMat);
        arrayStand.position.set(0.65, 0.75, 0);
        group.add(arrayStand);

        const panel = new THREE.Mesh(new THREE.BoxGeometry(1.35, 0.08, 1.65), solarPanelMat);
        panel.position.set(0.65, 1.28, 0);
        panel.rotation.x = 0.38;
        panel.castShadow = true;
        group.add(panel);

        // Glowing battery indicator bar
        const win = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.38, 0.08), makeWindowMat());
        win.position.set(-0.5, 0.85, 0.66);
        group.add(win);
      } else if (b.id === 'granary-mill') {
        const barn = new THREE.Mesh(new THREE.BoxGeometry(1.85, 1.25, 1.65), timberMat);
        barn.position.set(-0.2, 0.92, 0);
        barn.castShadow = true;
        group.add(barn);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.6, 0.95, 4), terracottaMat);
        roof.rotation.y = Math.PI / 4;
        roof.position.set(-0.2, 2.0, 0);
        roof.castShadow = true;
        group.add(roof);

        // Grain silo tower
        const silo = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.52, 1.8, 12), creamWallMat);
        silo.position.set(0.85, 1.2, -0.35);
        silo.castShadow = true;
        group.add(silo);
        const siloCap = new THREE.Mesh(new THREE.ConeGeometry(0.55, 0.45, 12), slateMat);
        siloCap.position.set(0.85, 2.3, -0.35);
        group.add(siloCap);

        // Animated waterwheel on side
        waterWheel = new THREE.Group();
        waterWheel.position.set(0.85, 0.85, 0.55);
        const rim = new THREE.Mesh(new THREE.TorusGeometry(0.45, 0.06, 6, 16), timberMat);
        waterWheel.add(rim);
        for (let s = 0; s < 4; s++) {
          const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.88, 0.07, 0.14), timberMat);
          spoke.rotation.z = (s * Math.PI) / 4;
          waterWheel.add(spoke);
        }
        group.add(waterWheel);

        const win = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 0.08), makeWindowMat());
        win.position.set(-0.2, 0.95, 0.84);
        group.add(win);
      } else if (b.id === 'eco-conservatory') {
        const baseWall = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.6, 1.6), stoneMat);
        baseWall.position.y = 0.6;
        baseWall.castShadow = true;
        group.add(baseWall);

        const glassHouse = new THREE.Mesh(new THREE.BoxGeometry(1.95, 0.9, 1.45), glassMat);
        glassHouse.position.y = 1.35;
        group.add(glassHouse);

        const greenhouseRoof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.65, 4), glassMat);
        greenhouseRoof.rotation.y = Math.PI / 4;
        greenhouseRoof.position.y = 2.1;
        group.add(greenhouseRoof);

        const planter = new THREE.Mesh(
          new THREE.BoxGeometry(1.5, 0.35, 0.8),
          new THREE.MeshStandardMaterial({ color: 0x55844d, roughness: 0.85 }),
        );
        planter.position.y = 1.05;
        group.add(planter);

        const win = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.3, 0.08), makeWindowMat());
        win.position.set(0, 0.62, 0.82);
        group.add(win);
      } else {
        // Community Knowledge Hall (central octagonal pavilion)
        const base = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.35, 1.25, 8), creamWallMat);
        base.position.y = 0.92;
        base.castShadow = true;
        group.add(base);

        const roof = new THREE.Mesh(new THREE.ConeGeometry(1.65, 1.0, 8), terracottaMat);
        roof.position.y = 2.02;
        roof.castShadow = true;
        group.add(roof);

        const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.36, 0.45, 8), makeWindowMat());
        lantern.position.y = 2.65;
        group.add(lantern);

        const lanternCap = new THREE.Mesh(new THREE.ConeGeometry(0.42, 0.32, 8), slateMat);
        lanternCap.position.y = 3.02;
        group.add(lanternCap);
      }

      // Scaffolding group shown when progress < 95%
      const scaffold = new THREE.Group();
      const postOffsets: Array<[number, number]> = [
        [-1.35, -1.1],
        [1.35, -1.1],
        [-1.35, 1.1],
        [1.35, 1.1],
      ];
      postOffsets.forEach(([px, pz]) => {
        const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 6), scaffoldMat);
        pole.position.set(px, 1.2, pz);
        scaffold.add(pole);
      });
      const rail1 = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.05, 0.06), scaffoldMat);
      rail1.position.set(0, 1.5, 1.1);
      scaffold.add(rail1);
      const rail2 = new THREE.Mesh(new THREE.BoxGeometry(2.75, 0.05, 0.06), scaffoldMat);
      rail2.position.set(0, 1.5, -1.1);
      scaffold.add(rail2);
      scaffold.visible = b.progress < 95;
      group.add(scaffold);

      // Selection / restoration highlight ring flush with plinth
      const glowRingGeo = new THREE.RingGeometry(1.55, 1.75, 32);
      glowRingGeo.rotateX(-Math.PI / 2);
      const glowRingMat = new THREE.MeshBasicMaterial({
        color: b.progress >= 100 ? 0x65966a : 0xe97832,
        transparent: true,
        opacity: 0.0,
        side: THREE.DoubleSide,
      });
      const glowRing = new THREE.Mesh(glowRingGeo, glowRingMat);
      glowRing.position.y = 0.06;
      group.add(glowRing);

      // Invisible proxy collision box on Layer 1 for fast raycasting
      const proxyMesh = new THREE.Mesh(
        new THREE.BoxGeometry(3.0, 3.0, 2.6),
        new THREE.MeshBasicMaterial({ visible: false }),
      );
      proxyMesh.position.y = 1.5;
      proxyMesh.layers.set(1);
      proxyMesh.userData = { buildingId: b.id, buildingName: b.name };
      group.add(proxyMesh);
      clickableProxies.push(proxyMesh);

      scene.add(group);
      buildingRefs[b.id] = {
        group,
        scaffold,
        windowMeshes: windowMats,
        glowRing,
        waterWheel,
        proxyMesh,
      };
    }

    buildingsRef.current.forEach(createCompositeBuilding);

    // 7. Drifting Himalayan Clouds
    const clouds: THREE.Group[] = [];
    const cloudMat = new THREE.MeshStandardMaterial({
      color: 0xfff9f1,
      roughness: 0.9,
      metalness: 0,
      transparent: true,
      opacity: 0.88,
    });
    for (let c = 0; c < 6; c++) {
      const cg = new THREE.Group();
      for (let p = 0; p < 3; p++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(1.2 - p * 0.2, 10, 8), cloudMat);
        puff.position.set((p - 1) * 1.1, (p % 2) * 0.28, 0);
        puff.scale.set(1.4, 0.72, 0.9);
        cg.add(puff);
      }
      cg.position.set(-18 + c * 7.5, 11.5 + (c % 3) * 1.6, -18 - (c % 2) * 5);
      scene.add(cg);
      clouds.push(cg);
    }

    // Raycaster for interactive building clicks & hover
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    let hoveredId: string | null = null;
    let lastHoverTime = 0;

    const updateMouseCoords = (ev: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      _rayMouse.x = ((ev.clientX - rect.left) / rect.width) * 2 - 1;
      _rayMouse.y = -((ev.clientY - rect.top) / rect.height) * 2 + 1;
    };

    const handlePointerMove = (ev: PointerEvent) => {
      if (mode === 'story') return;
      const now = performance.now();
      if (now - lastHoverTime < 45) return;
      lastHoverTime = now;
      updateMouseCoords(ev);
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const bid = hits[0].object.userData.buildingId as string;
        const bname = hits[0].object.userData.buildingName as string;
        if (hoveredId !== bid) {
          hoveredId = bid;
          setHoveredBuildingName(bname);
          renderer.domElement.style.cursor = 'pointer';
        }
      } else if (hoveredId !== null) {
        hoveredId = null;
        setHoveredBuildingName(null);
        renderer.domElement.style.cursor = 'grab';
      }
    };

    let pointerDownXY = { x: 0, y: 0 };
    const handlePointerDown = (ev: PointerEvent) => {
      pointerDownXY = { x: ev.clientX, y: ev.clientY };
    };
    const handlePointerUp = (ev: PointerEvent) => {
      if (mode === 'story') return;
      const dist = Math.hypot(ev.clientX - pointerDownXY.x, ev.clientY - pointerDownXY.y);
      if (dist > 6) return; // Was dragging orbit, not clicking
      updateMouseCoords(ev);
      raycaster.setFromCamera(_rayMouse, camera);
      const hits = raycaster.intersectObjects(clickableProxies, false);
      if (hits.length > 0) {
        const bid = hits[0].object.userData.buildingId as string;
        onSelectRef.current?.(bid);
      }
    };

    renderer.domElement.addEventListener('pointermove', handlePointerMove);
    renderer.domElement.addEventListener('pointerdown', handlePointerDown);
    renderer.domElement.addEventListener('pointerup', handlePointerUp);

    // Pre-compile shaders on hardware GPUs
    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Resize observer
    const handleResize = () => {
      if (!container) return;
      const w = Math.max(320, container.clientWidth);
      const h = Math.max(240, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    const ro = new ResizeObserver(handleResize);
    ro.observe(container);

    // Animation loop with afterDraw software-WebGL pacing
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      if (disposed) return;
      const gl = renderer.getContext() as WebGL2RenderingContext;
      if (!gl || typeof gl.fenceSync !== 'function') {
        frameId = window.setTimeout(cb, 80);
        return;
      }
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    // Story mode camera spline stops
    const storyStops = [
      { pos: new THREE.Vector3(16.5, 11.2, 18.5), look: new THREE.Vector3(0, 1.4, -2) }, // Hero panorama
      { pos: new THREE.Vector3(-9.5, 5.2, 6.2), look: new THREE.Vector3(-5.0, 1.4, -2.0) }, // Schoolhouse
      { pos: new THREE.Vector3(10.8, 5.4, 3.8), look: new THREE.Vector3(5.2, 1.3, -2.5) }, // Water plant & stream
      { pos: new THREE.Vector3(8.5, 4.8, 10.6), look: new THREE.Vector3(2.2, 1.2, 2.5) }, // Solar & Knowledge hall
      { pos: new THREE.Vector3(0.5, 12.2, 16.5), look: new THREE.Vector3(0, 1.0, 0) }, // Full valley overview
    ];

    function tick() {
      if (disposed) return;
      const delta = Math.min(0.1, clock.getDelta());
      const elapsed = clock.getElapsedTime();

      // Update lighting preset smoothly if changed
      if (lightingDirtyRef.current) {
        const lp = LIGHTING_PRESETS[lightingStateRef.current];
        (scene.background as THREE.Color).setHex(lp.skyHex);
        if (scene.fog instanceof THREE.FogExp2) {
          scene.fog.color.setHex(lp.fogHex);
        }
        sunLight.color.setHex(lp.sunHex);
        sunLight.intensity = lp.sunInt;
        sunLight.position.set(...lp.sunPos);
        hemiLight.color.setHex(lp.hemiSky);
        hemiLight.groundColor.setHex(lp.hemiGround);
        hemiLight.intensity = lp.hemiInt;
        lightingDirtyRef.current = false;
      }

      // Sync dynamic building progress (scaffolding, glow rings, window warmth)
      for (const b of buildingsRef.current) {
        const ref = buildingRefs[b.id];
        if (!ref) continue;
        ref.scaffold.visible = b.progress < 95;
        const isSelected = selectedIdRef.current === b.id || hoveredId === b.id;
        const ringMat = ref.glowRing.material as THREE.MeshBasicMaterial;
        ringMat.color.setHex(b.progress >= 100 ? 0x65966a : 0xe97832);
        const targetOpacity = isSelected ? 0.85 : b.progress >= 100 ? 0.32 : 0.14;
        ringMat.opacity = THREE.MathUtils.damp(ringMat.opacity, targetOpacity, 8, delta);

        const winIntensity =
          lightingStateRef.current === 'dusk'
            ? b.progress >= 70
              ? 1.25
              : 0.45
            : b.progress >= 70
              ? 0.65
              : 0.15;
        for (const wm of ref.windowMeshes) {
          wm.emissiveIntensity = winIntensity;
        }
        if (ref.waterWheel && !prefersReducedMotion) {
          ref.waterWheel.rotation.z -= delta * (b.progress >= 50 ? 0.85 : 0.2);
        }
      }

      // Drift clouds slowly
      if (!prefersReducedMotion) {
        clouds.forEach((cg, idx) => {
          cg.position.x += delta * (0.28 + idx * 0.04);
          if (cg.position.x > 26) cg.position.x = -26;
        });
      }

      // Camera motion
      if (mode === 'story') {
        const sp = THREE.MathUtils.clamp(scrollRef.current, 0, 1);
        const segFloat = sp * (storyStops.length - 1);
        const idx0 = Math.min(storyStops.length - 2, Math.floor(segFloat));
        const localT = segFloat - idx0;
        const smoothT = localT * localT * (3 - 2 * localT);
        _targetPos.lerpVectors(storyStops[idx0].pos, storyStops[idx0 + 1].pos, smoothT);
        _targetLook.lerpVectors(storyStops[idx0].look, storyStops[idx0 + 1].look, smoothT);

        // Subtle atmospheric float
        if (!prefersReducedMotion) {
          _targetPos.x += Math.sin(elapsed * 0.35) * 0.45;
          _targetPos.y += Math.cos(elapsed * 0.28) * 0.18;
        }
        const dampSpeed = prefersReducedMotion ? 20 : 4.5;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, _targetPos.x, dampSpeed, delta);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, _targetPos.y, dampSpeed, delta);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, _targetPos.z, dampSpeed, delta);
        _currentLook.x = THREE.MathUtils.damp(_currentLook.x, _targetLook.x, dampSpeed, delta);
        _currentLook.y = THREE.MathUtils.damp(_currentLook.y, _targetLook.y, dampSpeed, delta);
        _currentLook.z = THREE.MathUtils.damp(_currentLook.z, _targetLook.z, dampSpeed, delta);
        camera.lookAt(_currentLook);
      } else if (controls) {
        if (cameraFlyTargetRef.current.active) {
          const fly = cameraFlyTargetRef.current;
          const speed = prefersReducedMotion ? 25 : 5.5;
          camera.position.x = THREE.MathUtils.damp(camera.position.x, fly.pos.x, speed, delta);
          camera.position.y = THREE.MathUtils.damp(camera.position.y, fly.pos.y, speed, delta);
          camera.position.z = THREE.MathUtils.damp(camera.position.z, fly.pos.z, speed, delta);
          controls.target.x = THREE.MathUtils.damp(controls.target.x, fly.target.x, speed, delta);
          controls.target.y = THREE.MathUtils.damp(controls.target.y, fly.target.y, speed, delta);
          controls.target.z = THREE.MathUtils.damp(controls.target.z, fly.target.z, speed, delta);
          if (camera.position.distanceTo(fly.pos) < 0.08) {
            fly.active = false;
          }
        }
        controls.update();
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = requestAnimationFrame(tick);
      }
    }

    tick();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      ro.disconnect();
      renderer.domElement.removeEventListener('pointermove', handlePointerMove);
      renderer.domElement.removeEventListener('pointerdown', handlePointerDown);
      renderer.domElement.removeEventListener('pointerup', handlePointerUp);
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      renderer.domElement.removeEventListener('webglcontextrestored', handleContextRestored);
      controls?.dispose();
      envTex.dispose();
      grassTex.dispose();
      stoneTex.dispose();
      timberTex.dispose();
      slateTex.dispose();
      scene.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          const m = obj as THREE.Mesh;
          m.geometry.dispose();
          if (Array.isArray(m.material)) m.material.forEach((mat) => mat.dispose());
          else m.material.dispose();
        }
      });
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [mode]);

  return (
    <div className={`relative w-full h-full overflow-hidden ${className}`}>
      {/* Isolated WebGL mount container */}
      <div
        ref={mountRef}
        className="w-full h-full"
        aria-label="Interactive 3D Palampur Himalayan village"
      />

      {/* WebGL Context Lost Graceful Fallback */}
      {contextLost && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#FFF6E9] text-[#33251F] p-6 text-center z-20">
          <p className="font-display text-lg font-bold">3D Viewport Paused</p>
          <p className="text-sm text-[#75665C] mt-1 max-w-sm">
            Graphics context is recovering. Your Palampur progress remains safely saved.
          </p>
        </div>
      )}

      {/* Subtle hover name indicator in interactive mode (solid background, no backdrop-blur over WebGL) */}
      {mode !== 'story' && hoveredBuildingName && (
        <div className="pointer-events-none absolute top-4 left-1/2 -translate-x-1/2 z-10 rounded-lg border border-[#E9D9C7] bg-[#FFFDFA] px-3.5 py-1.5 shadow-sm text-xs font-medium text-[#33251F]">
          Click to inspect <span className="font-semibold text-[#C85A20]">{hoveredBuildingName}</span>
        </div>
      )}

      {/* Collapsible Bottom Control Dock (only in full interactive mode) */}
      {mode === 'interactive' && showDock && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center max-w-[94vw]">
          <button
            type="button"
            onClick={() => setDockCollapsed((v) => !v)}
            className="mb-1.5 inline-flex items-center gap-1.5 rounded-md border border-[#E9D9C7] bg-[#FFFDFA] px-3 py-1 text-xs font-medium text-[#33251F] shadow-sm hover:bg-[#FFF9F1] transition-colors whitespace-nowrap"
          >
            {dockCollapsed ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            <span>{dockCollapsed ? 'Show Controls' : 'Hide Controls'}</span>
          </button>

          {!dockCollapsed && (
            <div className="flex flex-wrap items-center justify-center gap-3 rounded-xl border border-[#E9D9C7] bg-[#FFFDFA]/95 px-4 py-2.5 shadow-md">
              <div className="flex items-center gap-1.5 pr-3 border-r border-[#E9D9C7]">
                <Compass className="w-3.5 h-3.5 text-[#C85A20] shrink-0" />
                <div className="flex items-center gap-1 overflow-x-auto">
                  {Object.entries(CAMERA_PRESETS).map(([key, preset]) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handlePresetClick(key)}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        activePreset === key
                          ? 'bg-[#E97832] text-[#FFFDFA]'
                          : 'text-[#75665C] hover:text-[#33251F] hover:bg-[#FFF6E9]'
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <Sun className="w-3.5 h-3.5 text-[#C85A20] shrink-0" />
                {(Object.keys(LIGHTING_PRESETS) as VillageTimeOfDay[]).map((tod) => (
                  <button
                    key={tod}
                    type="button"
                    onClick={() => handleTimeClick(tod)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      timeOfDay === tod
                        ? 'bg-[#33251F] text-[#FFF9F1]'
                        : 'text-[#75665C] hover:text-[#33251F] hover:bg-[#FFF6E9]'
                    }`}
                  >
                    {LIGHTING_PRESETS[tod].label}
                  </button>
                ))}
              </div>

              <span className="hidden lg:inline-flex items-center gap-1 text-[11px] text-[#75665C] pl-2 border-l border-[#E9D9C7] whitespace-nowrap">
                <Eye className="w-3 h-3" /> Drag to orbit · Click building
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
