"use strict";
(function () {
    const CONFIG = {
        startingGap: 125,
        breathing: true,
        gradientColors: [
            "#0A0A0A",
            "#2979FF",
            "#FF80AB",
            "#FF6D00",
            "#FFD600",
            "#00E676",
            "#3D5AFE",
        ],
        gradientStops: [35, 50, 60, 70, 80, 90, 100],
        animationSpeed: 0.02,
        breathingRange: 5,
        topOffset: 0,
    };
    function initGradient(host, el) {
        if (CONFIG.gradientColors.length !== CONFIG.gradientStops.length) {
            return;
        }
        const reduced = typeof window.matchMedia === "function" &&
            window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        let width = CONFIG.startingGap;
        let directionWidth = 1;
        let raf = 0;
        function frame() {
            if (width >= CONFIG.startingGap + CONFIG.breathingRange)
                directionWidth = -1;
            if (width <= CONFIG.startingGap - CONFIG.breathingRange)
                directionWidth = 1;
            if (!CONFIG.breathing || reduced)
                directionWidth = 0;
            width += directionWidth * CONFIG.animationSpeed;
            const stops = CONFIG.gradientStops
                .map((stop, i) => `${CONFIG.gradientColors[i]} ${stop}%`)
                .join(", ");
            el.style.background = `radial-gradient(${width}% ${width + CONFIG.topOffset}% at 50% 20%, ${stops})`;
            raf = requestAnimationFrame(frame);
        }
        frame();
        requestAnimationFrame(() => {
            host.classList.add("is-visible");
        });
        document.addEventListener("visibilitychange", () => {
            if (document.hidden) {
                cancelAnimationFrame(raf);
            }
            else {
                raf = requestAnimationFrame(frame);
            }
        });
    }
    document.addEventListener("DOMContentLoaded", () => {
        const host = document.getElementById("gradient-host");
        const el = document.getElementById("gradient-el");
        if (host && el)
            initGradient(host, el);
    });
})();
