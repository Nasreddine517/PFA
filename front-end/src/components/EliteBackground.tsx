import { useEffect, useRef } from "react";

const EliteBackground = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let mouseX = -1000;
    let mouseY = -1000;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouse = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };
    window.addEventListener("mousemove", handleMouse);

    // Subtle floating particles
    const particles: Array<{
      x: number; y: number; vx: number; vy: number;
      size: number; opacity: number; isGold: boolean; pulse: number;
    }> = [];

    for (let i = 0; i < 50; i++) {
      particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 0.2,
        vy: (Math.random() - 0.5) * 0.2,
        size: Math.random() * 1.5 + 0.5,
        opacity: Math.random() * 0.3 + 0.05,
        isGold: Math.random() > 0.8,
        pulse: Math.random() * Math.PI * 2,
      });
    }

    let t = 0;
    const animate = () => {
      t++;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Subtle ambient orbs
      const orbs = [
        { x: 0.15, y: 0.25, radius: 300, hue: 217, sat: 91, light: 60 },
        { x: 0.85, y: 0.75, radius: 250, hue: 47, sat: 100, light: 62 },
        { x: 0.5, y: 0.5, radius: 350, hue: 217, sat: 70, light: 40 },
      ];

      orbs.forEach((orb) => {
        const ox = (orb.x + Math.sin(t * 0.0003) * 0.05) * canvas.width;
        const oy = (orb.y + Math.cos(t * 0.0004) * 0.05) * canvas.height;
        const gradient = ctx.createRadialGradient(ox, oy, 0, ox, oy, orb.radius);
        gradient.addColorStop(0, `hsla(${orb.hue}, ${orb.sat}%, ${orb.light}%, 0.04)`);
        gradient.addColorStop(1, "transparent");
        ctx.fillStyle = gradient;
        ctx.fillRect(ox - orb.radius, oy - orb.radius, orb.radius * 2, orb.radius * 2);
      });

      // Mouse glow
      if (mouseX > 0) {
        const mg = ctx.createRadialGradient(mouseX, mouseY, 0, mouseX, mouseY, 180);
        mg.addColorStop(0, "hsla(217, 91%, 60%, 0.04)");
        mg.addColorStop(1, "transparent");
        ctx.fillStyle = mg;
        ctx.fillRect(mouseX - 180, mouseY - 180, 360, 360);
      }

      // Particles
      particles.forEach((p, i) => {
        p.pulse += 0.015;
        const pulseFactor = 0.6 + Math.sin(p.pulse) * 0.4;

        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 180) {
          const force = (180 - dist) / 180 * 0.01;
          p.vx += dx * force * 0.01;
          p.vy += dy * force * 0.01;
        }

        p.x += p.vx;
        p.y += p.vy;
        p.vx *= 0.995;
        p.vy *= 0.995;

        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        const hue = p.isGold ? 47 : 217;
        const sat = p.isGold ? 100 : 91;
        const light = p.isGold ? 62 : 60;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * pulseFactor, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${hue}, ${sat}%, ${light}%, ${p.opacity * pulseFactor * 0.8})`;
        ctx.fill();

        // Connections (subtle)
        for (let j = i + 1; j < particles.length; j++) {
          const dx2 = p.x - particles[j].x;
          const dy2 = p.y - particles[j].y;
          const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
          if (d2 < 120) {
            const alpha = 0.06 * (1 - d2 / 120) * pulseFactor;
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `hsla(217, 60%, 50%, ${alpha})`;
            ctx.lineWidth = 0.4;
            ctx.stroke();
          }
        }
      });

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouse);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0"
      style={{ opacity: 0.6 }}
    />
  );
};

export default EliteBackground;
