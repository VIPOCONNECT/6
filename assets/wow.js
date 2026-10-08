(function () {
    "use strict";

    var reduceMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.documentElement.classList.add("wow-js");

    var CATEGORY_ICONS = {
        furniture: "fa-couch",
        spa: "fa-hot-tub",
        electrical: "fa-tv",
        garden: "fa-leaf",
        covering: "fa-layer-group",
        mobile: "fa-campground",
        structure: "fa-building",
        office: "fa-briefcase",
        sport: "fa-water",
        kids: "fa-baby"
    };

    function isDark() {
        return document.documentElement.getAttribute("data-theme") === "dark";
    }

    /* ---------- Hero globe ---------- */
    function initGlobe() {
        var header = document.querySelector(".container > header");
        if (!header || typeof THREE === "undefined") return;

        var holder = document.createElement("div");
        holder.className = "wow-hero-visual";
        holder.setAttribute("aria-hidden", "true");
        header.insertBefore(holder, header.firstChild);
        header.classList.add("wow-hero");

        var renderer;
        try {
            renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        } catch (e) {
            holder.classList.add("wow-no-webgl");
            return;
        }
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        holder.appendChild(renderer.domElement);

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(0, 0, 6.2);

        var R = 1.6;
        var globe = new THREE.Group();
        scene.add(globe);

        var baseMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.92 });
        globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 64, 64), baseMat));

        var N = 2200;
        var pos = new Float32Array(N * 3);
        var golden = Math.PI * (3 - Math.sqrt(5));
        for (var i = 0; i < N; i++) {
            var y = 1 - (i / (N - 1)) * 2;
            var rr = Math.sqrt(1 - y * y);
            var th = golden * i;
            pos[i * 3] = Math.cos(th) * rr * (R + 0.005);
            pos[i * 3 + 1] = y * (R + 0.005);
            pos[i * 3 + 2] = Math.sin(th) * rr * (R + 0.005);
        }
        var dotsGeo = new THREE.BufferGeometry();
        dotsGeo.setAttribute("position", new THREE.BufferAttribute(pos, 3));
        var dotsMat = new THREE.PointsMaterial({ size: 0.03, transparent: true, opacity: 0.9 });
        globe.add(new THREE.Points(dotsGeo, dotsMat));

        var ringMat = new THREE.LineBasicMaterial({ transparent: true, opacity: 0.18 });
        [-60, -30, 0, 30, 60].forEach(function (lat) {
            var pts = [];
            var phi = (90 - lat) * Math.PI / 180;
            for (var k = 0; k <= 96; k++) {
                var t = (k / 96) * Math.PI * 2;
                pts.push(new THREE.Vector3(
                    Math.sin(phi) * Math.cos(t) * (R + 0.01),
                    Math.cos(phi) * (R + 0.01),
                    Math.sin(phi) * Math.sin(t) * (R + 0.01)
                ));
            }
            globe.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), ringMat));
        });

        function latLon(lat, lon, r) {
            var phi = (90 - lat) * Math.PI / 180;
            var theta = (lon + 180) * Math.PI / 180;
            return new THREE.Vector3(
                -r * Math.sin(phi) * Math.cos(theta),
                r * Math.cos(phi),
                r * Math.sin(phi) * Math.sin(theta)
            );
        }

        var china = latLon(31.2, 121.5, R);
        var israel = latLon(32.1, 34.8, R);
        var mid = china.clone().add(israel).multiplyScalar(0.5).normalize().multiplyScalar(R * 1.95);
        var curve = new THREE.QuadraticBezierCurve3(china, mid, israel);

        var accentMat = new THREE.MeshBasicMaterial();
        globe.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.012, 8, false), accentMat));

        var markerGeo = new THREE.SphereGeometry(0.045, 16, 16);
        [china, israel].forEach(function (p) {
            var m = new THREE.Mesh(markerGeo, accentMat);
            m.position.copy(p);
            globe.add(m);
        });

        var pulses = [];
        var pulseMat = new THREE.MeshBasicMaterial({ transparent: true, side: THREE.DoubleSide });
        [china, israel].forEach(function (p, idx) {
            var ring = new THREE.Mesh(new THREE.RingGeometry(0.06, 0.08, 32), pulseMat.clone());
            ring.position.copy(p.clone().multiplyScalar(1.002));
            ring.lookAt(p.clone().multiplyScalar(2));
            ring.userData.offset = idx * 0.5;
            globe.add(ring);
            pulses.push(ring);
        });

        var ship = new THREE.Mesh(new THREE.SphereGeometry(0.035, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        globe.add(ship);

        var focus = mid.clone().normalize();
        var baseY = -Math.atan2(focus.x, focus.z);
        globe.rotation.x = 0.42;
        globe.rotation.y = baseY;

        function applyTheme() {
            var dark = isDark();
            baseMat.color.set(dark ? 0x0b1220 : 0xffffff);
            dotsMat.color.set(dark ? 0x9fb3d9 : 0x0c2340);
            dotsMat.opacity = dark ? 0.9 : 0.5;
            ringMat.color.set(dark ? 0x8fa3c8 : 0x0c2340);
            ringMat.opacity = dark ? 0.1 : 0.12;
            accentMat.color.set(dark ? 0xd4b26a : 0xb08a4a);
            pulses.forEach(function (p) { p.material.color.set(dark ? 0xd4b26a : 0xb08a4a); });
            ship.material.color.set(dark ? 0xffffff : 0x0c2340);
        }
        applyTheme();
        new MutationObserver(applyTheme).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });

        function resize() {
            var w = holder.clientWidth || 1;
            var h = holder.clientHeight || 1;
            renderer.setSize(w, h, false);
            camera.aspect = w / h;
            camera.updateProjectionMatrix();
        }
        resize();
        if (window.ResizeObserver) new ResizeObserver(resize).observe(holder);
        else window.addEventListener("resize", resize);

        var visible = true;
        if (window.IntersectionObserver) {
            new IntersectionObserver(function (entries) {
                visible = entries[0].isIntersecting;
            }).observe(holder);
        }

        var start = performance.now();
        function frame(now) {
            var t = (now - start) / 1000;
            globe.rotation.y = baseY + Math.sin(t * 0.25) * 0.35;
            var s = (t * 0.18) % 1;
            ship.position.copy(curve.getPoint(s));
            pulses.forEach(function (p) {
                var k = ((t * 0.6 + p.userData.offset) % 1);
                p.scale.setScalar(1 + k * 2.5);
                p.material.opacity = 0.8 * (1 - k);
            });
            renderer.render(scene, camera);
        }

        if (reduceMotion) {
            ship.position.copy(curve.getPoint(0.5));
            renderer.render(scene, camera);
            new MutationObserver(function () { renderer.render(scene, camera); })
                .observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
            return;
        }

        (function loop(now) {
            if (visible && !document.hidden) frame(now);
            requestAnimationFrame(loop);
        })(performance.now());
    }

    /* ---------- Category marquee ---------- */
    function initMarquee() {
        var intro = document.querySelector(".intro-container");
        var heads = document.querySelectorAll(".catalog-category > h4");
        if (!intro || !heads.length) return;

        var wrap = document.createElement("div");
        wrap.className = "wow-marquee";
        var track = document.createElement("div");
        track.className = "wow-marquee-track";
        wrap.appendChild(track);

        function buildGroup(hidden) {
            var group = document.createElement("div");
            group.className = "wow-marquee-group";
            if (hidden) group.setAttribute("aria-hidden", "true");
            heads.forEach(function (h) {
                var m = /toggleCatalogMenu\('([^']+)'\)/.exec(h.getAttribute("onclick") || "");
                var id = m ? m[1] : "";
                var chip = document.createElement("button");
                chip.type = "button";
                chip.className = "wow-chip";
                if (hidden) chip.tabIndex = -1;
                var icon = document.createElement("i");
                icon.className = "fas " + (CATEGORY_ICONS[id] || "fa-box");
                icon.setAttribute("aria-hidden", "true");
                var label = document.createElement("span");
                label.className = "translatable";
                if (h.dataset.key) label.setAttribute("data-key", h.dataset.key);
                label.textContent = h.textContent;
                chip.appendChild(icon);
                chip.appendChild(label);
                chip.addEventListener("click", function () {
                    if (typeof toggleSidebar === "function") toggleSidebar();
                    if (id && typeof toggleCatalogMenu === "function") {
                        var items = document.getElementById(id);
                        if (items && items.style.display === "none") toggleCatalogMenu(id);
                    }
                });
                group.appendChild(chip);
            });
            return group;
        }

        track.appendChild(buildGroup(false));
        track.appendChild(buildGroup(true));
        intro.parentNode.insertBefore(wrap, intro.nextSibling);
    }

    /* ---------- Reveal on scroll ---------- */
    function initReveal() {
        var selectors = [
            ".intro-container",
            ".wow-marquee",
            ".services h2", ".service-card",
            "#how-it-works h2", "#how-it-works > div > div",
            ".benefits h2", ".benefits-list li",
            ".testimonials-title", ".testimonial-card",
            ".contact h2", ".contact-form",
            ".calculator-section"
        ];
        var els = [];
        selectors.forEach(function (sel) {
            document.querySelectorAll(sel).forEach(function (el, i) {
                el.classList.add("wow-reveal");
                el.style.setProperty("--wow-delay", ((i % 4) * 80) + "ms");
                els.push(el);
            });
        });

        if (reduceMotion || !window.IntersectionObserver) {
            els.forEach(function (el) { el.classList.add("is-in"); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-in");
                    io.unobserve(entry.target);
                }
            });
        }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
        els.forEach(function (el) { io.observe(el); });
    }

    /* ---------- Timeline progress ---------- */
    function initTimeline() {
        var list = document.querySelector("#how-it-works > div");
        if (!list) return;
        var steps = Array.prototype.slice.call(list.children).filter(function (el) { return el.tagName === "DIV"; });
        var fill = document.createElement("span");
        fill.className = "wow-line-fill";
        fill.setAttribute("aria-hidden", "true");
        list.appendChild(fill);

        var ticking = false;
        function update() {
            ticking = false;
            var rect = list.getBoundingClientRect();
            var vh = window.innerHeight || 800;
            var p = (vh * 0.65 - rect.top) / Math.max(rect.height, 1);
            p = Math.max(0, Math.min(1, p));
            list.style.setProperty("--wow-p", p.toFixed(3));
            steps.forEach(function (s, i) {
                var at = steps.length > 1 ? i / (steps.length - 1) : 0;
                s.classList.toggle("is-done", p >= at - 0.02);
            });
        }
        function onScroll() {
            if (!ticking) {
                ticking = true;
                requestAnimationFrame(update);
            }
        }
        window.addEventListener("scroll", onScroll, { passive: true });
        window.addEventListener("resize", onScroll);
        update();
    }

    function init() {
        try { initMarquee(); } catch (e) { console.error("wow marquee", e); }
        try { initGlobe(); } catch (e) { console.error("wow globe", e); }
        try { initReveal(); } catch (e) { console.error("wow reveal", e); }
        try { initTimeline(); } catch (e) { console.error("wow timeline", e); }
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
