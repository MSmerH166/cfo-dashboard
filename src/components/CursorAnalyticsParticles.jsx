import { useEffect, useRef } from 'react';
import * as THREE from 'three';

/**
 * تأثير جسيمات تفاعلي مع المؤشر بأسلوب تحليلات مالية هادئ.
 * - ألوان هادئة (أزرق، تركواز، أخضر خفيف) على خلفية كحلية
 * - حركة بطيئة ومنحنية توحي بتدفقات البيانات/الاتجاهات
 * - تفاعل لطيف مع المؤشر (تأثير جذب خفيف وليس تتبع مباشر)
 * - عدد جسيمات منخفض ومُحسّن للخلفيات
 * - يعتمد على حزمة three المحلية لتجنب أخطاء CDN
 */
export default function CursorAnalyticsParticles() {
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
        camera.position.set(0, 0, 28);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio || 1);
        renderer.setClearColor(0x0b1226, 0); // شفاف للحفاظ على الخلفية الكحلية القائمة
        container.appendChild(renderer.domElement);

        // إعداد الجسيمات
        const count = 140;
        const positions = new Float32Array(count * 3);
        const velocities = new Float32Array(count * 3);
        const anchors = new Float32Array(count * 3);
        const colors = new Float32Array(count * 3);

        const palette = [
          new THREE.Color('#4da3ff'),
          new THREE.Color('#35c3b4'),
          new THREE.Color('#6cb0ff'),
          new THREE.Color('#3fa58a'),
        ];

        // منحنيات مرجعية لتشكيل إحساس "بياني"
        const curveAnchors = [];
        const makeCurve = (offsetY, amplitude, phase) => {
          const pts = [];
          for (let i = 0; i < 7; i++) {
            const x = (i - 3) * 6;
            const y = Math.sin(i * 0.7 + phase) * amplitude + offsetY;
            pts.push(new THREE.Vector3(x, y, -4 - Math.random() * 2));
          }
          curveAnchors.push(new THREE.CatmullRomCurve3(pts));
        };
        makeCurve(-2, 1.8, 0.3);
        makeCurve(0.8, 1.5, 1.2);
        makeCurve(2.2, 1.2, -0.6);

        for (let i = 0; i < count; i++) {
          const curve = curveAnchors[i % curveAnchors.length];
          const t = (i % 20) / 20 + Math.random() * 0.05;
          const point = curve.getPoint(t);

          const jitter = () => (Math.random() - 0.5) * 1.2;
          positions[i * 3 + 0] = point.x + jitter();
          positions[i * 3 + 1] = point.y + jitter();
          positions[i * 3 + 2] = point.z + jitter() * 0.4;

          anchors[i * 3 + 0] = point.x;
          anchors[i * 3 + 1] = point.y;
          anchors[i * 3 + 2] = point.z;

          velocities[i * 3 + 0] = (Math.random() - 0.5) * 0.01;
          velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.01;
          velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.005;

          const c = palette[Math.floor(Math.random() * palette.length)];
          colors.set([c.r, c.g, c.b], i * 3);
        }

        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

        const material = new THREE.PointsMaterial({
          size: 0.22,
          transparent: true,
          opacity: 0.85,
          vertexColors: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
        });

        const points = new THREE.Points(geometry, material);
        scene.add(points);

        // إضاءة خافتة
        scene.add(new THREE.AmbientLight(0x3a6bb0, 0.25));

        // تفاعل المؤشر (تأثير جذب خفيف)
        let cursor = { x: 0, y: 0 };
        const onPointerMove = (e) => {
          cursor.x = (e.clientX / window.innerWidth) * 2 - 1;
          cursor.y = -(e.clientY / window.innerHeight) * 2 + 1;
        };
        window.addEventListener('pointermove', onPointerMove);

        const onResize = () => {
          camera.aspect = window.innerWidth / window.innerHeight;
          camera.updateProjectionMatrix();
          renderer.setSize(window.innerWidth, window.innerHeight);
        };
        window.addEventListener('resize', onResize);

        let animId = null;
        let tGlobal = 0;
        const animate = () => {
          animId = requestAnimationFrame(animate);
          tGlobal += 0.0035;
          const pos = geometry.attributes.position.array;

          for (let i = 0; i < count; i++) {
            const idx = i * 3;
            // جذب خفيف نحو نقطة الارتكاز (يضمن حركة منحنية مستقرة)
            const ax = anchors[idx] + Math.sin(tGlobal * 1.3 + i) * 0.35;
            const ay = anchors[idx + 1] + Math.cos(tGlobal * 1.1 + i * 0.4) * 0.28;
            const az = anchors[idx + 2];

            const dx = ax - pos[idx];
            const dy = ay - pos[idx + 1];
            const dz = az - pos[idx + 2];

            velocities[idx] += dx * 0.0035;
            velocities[idx + 1] += dy * 0.0035;
            velocities[idx + 2] += dz * 0.0015;

            // تأثير المؤشر (تباعد/جذب خفيف)
            const worldCursorX = cursor.x * 12;
            const worldCursorY = cursor.y * 7;
            const cx = pos[idx] - worldCursorX;
            const cy = pos[idx + 1] - worldCursorY;
            const dist2 = cx * cx + cy * cy + 0.0001;
            const influence = Math.min(0.12, 2.4 / dist2); // تأثير يتلاشى مع المسافة
            velocities[idx] += cx * influence * 0.0006;
            velocities[idx + 1] += cy * influence * 0.0006;

            // تخميد السرعة
            velocities[idx] *= 0.96;
            velocities[idx + 1] *= 0.96;
            velocities[idx + 2] *= 0.96;

            // تحديث الموقع
            pos[idx] += velocities[idx];
            pos[idx + 1] += velocities[idx + 1];
            pos[idx + 2] += velocities[idx + 2];
          }

          geometry.attributes.position.needsUpdate = true;
          points.rotation.y += 0.0004;
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
        console.warn('CursorAnalyticsParticles disabled (Three.js import failed)', err);
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
