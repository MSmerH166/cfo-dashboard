import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * خلفية جسيمات هادئة مستوحاة من تدفقات البيانات والتحليل المالي.
 * - ألوان كحلي/أزرق/أخضر هادئة
 * - حركة بطيئة جداً مع تفاعل بارالاكس خفيف مع الماوس
 * - لا تتداخل مع تفاعل الصفحة (pointer-events: none)
 * - يعتمد الآن على حزمة three المحلية لتجنب أخطاء CDN
 */
export default function BackgroundParticles() {
  const containerRef = useRef(null);
  const cleanupRef = useRef(() => {});

  useEffect(() => {
    let mounted = true;
    (() => {
      const container = containerRef.current;
      if (!container) return;

      try {
        if (!mounted) return;

        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(0, 0, 35);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setClearColor(0x0b1226, 1); // خلفية داكنة
        container.appendChild(renderer.domElement);

        // ألوان هادئة
        const palette = [
          new THREE.Color('#4da3ff'),
          new THREE.Color('#35c3b4'),
          new THREE.Color('#6cb0ff'),
          new THREE.Color('#3fa58a'),
        ];

        // جسيمات البيانات
        const count = 900;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);
        for (let i = 0; i < count; i++) {
          const r = () => Math.random() - 0.5;
          positions[i * 3 + 0] = r() * 60;
          positions[i * 3 + 1] = r() * 35;
          positions[i * 3 + 2] = r() * 20;

          velocities[i * 3 + 0] = r() * 0.02;
          velocities[i * 3 + 1] = r() * 0.015;
          velocities[i * 3 + 2] = r() * 0.01;

          const c = palette[Math.floor(Math.random() * palette.length)];
          colors.set([c.r, c.g, c.b], i * 3);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: 0.25,
          transparent: true,
          opacity: 0.8,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // خطوط موجية خافتة مستوحاة من المخططات
        const curveMaterial = new THREE.LineBasicMaterial({
          color: 0x2f6fb0,
          transparent: true,
          opacity: 0.08,
        });
        for (let j = 0; j < 4; j++) {
          const curvePoints = [];
          for (let i = 0; i < 6; i++) {
            curvePoints.push(
              new THREE.Vector3(
                (i - 3) * 12 + Math.random() * 4,
                Math.sin(i * 0.9 + j) * 4 + (j - 1.5) * 5,
                -8 - j
              )
            );
          }
          const curve = new THREE.CatmullRomCurve3(curvePoints);
          const curveGeom = new THREE.BufferGeometry().setFromPoints(curve.getPoints(120));
          const line = new THREE.Line(curveGeom, curveMaterial);
          scene.add(line);
        }

        // إضاءة خافتة
        const light = new THREE.AmbientLight(0x4d6fb5, 0.3);
        scene.add(light);

        // بارالاكس خفيف مع الماوس
        let targetX = 0;
        let targetY = 0;
        const onPointerMove = (e) => {
          const x = (e.clientX / window.innerWidth) * 2 - 1;
          const y = (e.clientY / window.innerHeight) * 2 - 1;
          targetX = x * 2;
          targetY = -y * 2;
        };
        window.addEventListener('pointermove', onPointerMove);

        // تغيير الحجم
        const onResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        let animId;
        const animate = () => {
          animId = requestAnimationFrame(animate);
          const pos = geometry.attributes.position.array;
          for (let i = 0; i < count; i++) {
            pos[i * 3 + 0] += velocities[i * 3 + 0];
            pos[i * 3 + 1] += velocities[i * 3 + 1];
            pos[i * 3 + 2] += velocities[i * 3 + 2];

            // إعادة تدوير ناعم
            if (pos[i * 3 + 0] > 60) pos[i * 3 + 0] = -60;
            if (pos[i * 3 + 0] < -60) pos[i * 3 + 0] = 60;
            if (pos[i * 3 + 1] > 35) pos[i * 3 + 1] = -35;
            if (pos[i * 3 + 1] < -35) pos[i * 3 + 1] = 35;
            if (pos[i * 3 + 2] > 20) pos[i * 3 + 2] = -20;
            if (pos[i * 3 + 2] < -20) pos[i * 3 + 2] = 20;
          }
          geometry.attributes.position.needsUpdate = true;

          camera.position.x += (targetX - camera.position.x) * 0.03;
          camera.position.y += (targetY - camera.position.y) * 0.03;
          camera.lookAt(0, 0, 0);

          points.rotation.y += 0.0006;
          renderer.render(scene, camera);
        };
        animate();

        cleanupRef.current = () => {
          mounted = false;
          cancelAnimationFrame(animId);
          window.removeEventListener('pointermove', onPointerMove);
          window.removeEventListener('resize', onResize);
          geometry.dispose();
          material.dispose();
          renderer.dispose();
          if (renderer.domElement && renderer.domElement.parentNode) {
            renderer.domElement.parentNode.removeChild(renderer.domElement);
          }
        };
      } catch (err) {
        // إذا فشل تحميل المكتبة من CDN، نعمل بصمت دون كسر الصفحة
        console.warn('BackgroundParticles disabled (Three.js import failed)', err);
        cleanupRef.current = () => {};
      }
    })();

    return () => {
      cleanupRef.current();
      mounted = false;
    };
  }, []);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: -1,
        pointerEvents: 'none',
      }}
    />
  );
}
