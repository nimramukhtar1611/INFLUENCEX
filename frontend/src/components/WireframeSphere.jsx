import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

const InfluenceGlobe = () => {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const { clientWidth: width, clientHeight: height } = mountRef.current;
    const scene = new THREE.Scene();
    
    // Camera position - thoda peeche taake globe aur text sahi dikhayi dein
    const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 1000);
    camera.position.z = 10;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(window.devicePixelRatio);
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(5, 5, 5);
    scene.add(pointLight);

    const mainGroup = new THREE.Group();
    scene.add(mainGroup);

    // --- 1. THE GLOBE ---
    const globeGeo = new THREE.SphereGeometry(3, 64, 64);
    const globeTex = new THREE.TextureLoader().load('https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/planets/earth_atmos_2048.jpg');
    const globeMat = new THREE.MeshStandardMaterial({ map: globeTex });
    const globe = new THREE.Mesh(globeGeo, globeMat);
    mainGroup.add(globe);

    // --- 2. WRAPPING TEXT (INFLUENCE X) ---
  // --- 2. WRAPPING TEXT (INFLUENCE X) ---
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const fontSize = 120;
    const label = " INFLUENCE X "; // Side spaces se letters nahi chipkenge
    
    ctx.font = `900 ${fontSize}px sans-serif`;
    
    // Exact text width measure karein
    const textWidth = ctx.measureText(label).width;
    
    // Canvas ki width exact textWidth ke barabar set karein
    // Isse start aur end ke beech koi extra gap ya overlap nahi aayega
    canvas.width = textWidth; 
    canvas.height = 200;

    // Reset font after resizing canvas
 ctx.font = `600 ${fontSize}px "Poppins", sans-serif`; 
ctx.fillStyle = 'gray';
ctx.textBaseline = 'middle';
ctx.textAlign = 'center';
    // Sirf EK baar text draw karein center mein
    ctx.fillText(label, canvas.width / 2, canvas.height / 2);

    const textTexture = new THREE.CanvasTexture(canvas);
    
    // RepeatWrapping ab perfect kaam karega
    textTexture.wrapS = THREE.RepeatWrapping;
    
    // Text ko cylinder par kitni baar repeat karna hai yahan se control karein
    // 3 ya 4 repeats best lagte hain
    textTexture.repeat.set(4, 1); 
    
    textTexture.anisotropy = 16;

    const textGeo = new THREE.CylinderGeometry(3.4, 3.4, 2, 64, 1, true);
    const textMat = new THREE.MeshBasicMaterial({
      map: textTexture,
      transparent: true,
      side: THREE.DoubleSide,
      alphaTest: 0.1,
    });
    
    const textRing = new THREE.Mesh(textGeo, textMat);
    mainGroup.add(textRing);
    // --- 3. BACKGROUND PARTICLES ---
    const pCount = 1000;
    const pGeo = new THREE.BufferGeometry();
    const pPos = new Float32Array(pCount * 3);
    for (let i = 0; i < pCount * 3; i++) pPos[i] = (Math.random() - 0.5) * 30;
    pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
    const pMat = new THREE.PointsMaterial({ size: 0.04, color: 0xffffff, transparent: true, opacity: 0.8 });
    const particles = new THREE.Points(pGeo, pMat);
    scene.add(particles);

    // Animation logic
    let frameId;
    const animate = () => {
      const time = Date.now() * 0.0005;
      
      // Globe aur Text ki rotation speeds
      globe.rotation.y += 0.002;
      textRing.rotation.y -= 0.008; // Text thoda fast ghum raha hai cinematic feel ke liye
      
      // Floating motion
      mainGroup.position.y = Math.sin(time) * 0.3;
      particles.rotation.y += 0.0003;

      renderer.render(scene, camera);
      frameId = requestAnimationFrame(animate);
    };

    animate();

    const handleResize = () => {
      camera.aspect = mountRef.current.clientWidth / mountRef.current.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div 
      ref={mountRef} 
      style={{ 
        width: '100%', 
        height: '100vh', 
        background: '#000', 
        position: 'fixed', 
        top: 0, 
        left: 0, 
        zIndex: 0, // Fixed z-index to make the globe visible
        pointerEvents: 'none' // Isse aap animation ke upar click karke form fill kar sakenge
      }} 
    />
  );
};

export default InfluenceGlobe; 