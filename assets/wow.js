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
        renderer.outputEncoding = THREE.sRGBEncoding;
        holder.appendChild(renderer.domElement);

        var scene = new THREE.Scene();
        var camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
        camera.position.set(0, 0, 6.2);

        var R = 1.6;
        var globe = new THREE.Group();
        scene.add(globe);

        var loader = new THREE.TextureLoader();
        var maxAniso = renderer.capabilities.getMaxAnisotropy();
        var redraw = function () {};
        function tex(name, srgb, onLoad) {
            return loader.load("assets/img/earth/" + name, function (t) {
                if (srgb) t.encoding = THREE.sRGBEncoding;
                t.anisotropy = maxAniso;
                if (onLoad) onLoad(t);
                redraw();
            });
        }

        var earthMat = new THREE.MeshPhongMaterial({
            color: 0xffffff,
            specular: new THREE.Color(0x2a3f5c),
            shininess: 22,
            emissive: new THREE.Color(0xffc982),
            emissiveIntensity: 0
        });
        earthMat.map = tex("earth_atmos_2048.jpg", true, function () {
            earthMat.needsUpdate = true;
            holder.classList.add("is-loaded");
        });
        setTimeout(function () { holder.classList.add("is-loaded"); }, 5000);
        earthMat.specularMap = tex("earth_specular_2048.jpg", false);
        globe.add(new THREE.Mesh(new THREE.SphereGeometry(R, 96, 96), earthMat));

        var lightsLoaded = false;
        function loadLights() {
            if (lightsLoaded) return;
            lightsLoaded = true;
            earthMat.emissiveMap = tex("earth_lights_2048.jpg", true, function () { earthMat.needsUpdate = true; });
        }

        var cloudMat = new THREE.MeshLambertMaterial({ transparent: true, opacity: 0.5, depthWrite: false });
        cloudMat.map = tex("earth_clouds_1024.png", true, function () { cloudMat.needsUpdate = true; });
        var clouds = new THREE.Mesh(new THREE.SphereGeometry(R * 1.012, 64, 64), cloudMat);
        globe.add(clouds);

        var atmoMat = new THREE.ShaderMaterial({
            uniforms: { glowColor: { value: new THREE.Color(0x4f9dff) }, power: { value: 0.75 } },
            vertexShader: "varying vec3 vN; void main(){ vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
            fragmentShader: "uniform vec3 glowColor; uniform float power; varying vec3 vN; void main(){ float i = pow(0.68 - dot(vN, vec3(0.0,0.0,1.0)), 3.2) * power; gl_FragColor = vec4(glowColor, 1.0) * i; }",
            side: THREE.BackSide,
            blending: THREE.AdditiveBlending,
            transparent: true,
            depthWrite: false
        });
        scene.add(new THREE.Mesh(new THREE.SphereGeometry(R * 1.2, 64, 64), atmoMat));

        var ambient = new THREE.AmbientLight(0x9fb4d8, 0.5);
        var sun = new THREE.DirectionalLight(0xffffff, 1.15);
        sun.position.set(-4, 2.2, 5);
        scene.add(ambient);
        scene.add(sun);

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
        var arcGlowMat = new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false });
        globe.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 96, 0.04, 8, false), arcGlowMat));

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
            if (dark) loadLights();
            earthMat.emissiveIntensity = dark ? 0.85 : 0;
            ambient.intensity = dark ? 0.32 : 0.55;
            sun.intensity = dark ? 1.05 : 1.2;
            accentMat.color.set(0xf2c879);
            arcGlowMat.color.set(0xf2c879);
            pulses.forEach(function (p) { p.material.color.set(0xf2c879); });
            ship.material.color.set(0xffffff);
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
            clouds.rotation.y = t * 0.018;
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
            redraw = function () { renderer.render(scene, camera); };
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
                chip.className = "wow-chip wow-cat";
                if (hidden) chip.tabIndex = -1;
                if (id) {
                    var img = document.createElement("img");
                    img.src = "assets/img/cat-" + id + ".jpg";
                    img.alt = "";
                    img.loading = "lazy";
                    img.decoding = "async";
                    img.onerror = function () { this.remove(); chip.classList.add("wow-cat-noimg"); };
                    chip.appendChild(img);
                }
                var cap = document.createElement("span");
                cap.className = "wow-cat-cap";
                var icon = document.createElement("i");
                icon.className = "fas " + (CATEGORY_ICONS[id] || "fa-box");
                icon.setAttribute("aria-hidden", "true");
                var label = document.createElement("span");
                label.className = "translatable";
                if (h.dataset.key) label.setAttribute("data-key", h.dataset.key);
                label.textContent = h.textContent;
                cap.appendChild(icon);
                cap.appendChild(label);
                chip.appendChild(cap);
                chip.addEventListener("click", function () {
                    if (window.wowOpenCatalogs) { window.wowOpenCatalogs(id); return; }
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
            ".calculator-section",
            ".benefits-image",
            ".wow-cta-inner"
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
            els.forEach(function (el) { el.classList.add("is-in", "wow-settled"); });
            return;
        }

        var io = new IntersectionObserver(function (entries) {
            entries.forEach(function (entry) {
                if (entry.isIntersecting) {
                    var el = entry.target;
                    el.classList.add("is-in");
                    io.unobserve(el);
                    setTimeout(function () { el.classList.add("wow-settled"); }, 1100);
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

    function textOf(selector, fallback) {
        var el = document.querySelector(selector);
        return el ? el.textContent.trim() : (fallback || "");
    }

    function translatableSpan(key, selector) {
        var s = document.createElement("span");
        s.className = "translatable";
        s.setAttribute("data-key", key);
        s.textContent = textOf(selector || '[data-key="' + key + '"]');
        return s;
    }

    function iconEl(cls) {
        var i = document.createElement("i");
        i.className = cls;
        i.setAttribute("aria-hidden", "true");
        return i;
    }

    function openCatalog() {
        if (typeof toggleSidebar === "function") toggleSidebar();
    }

    /* ---------- Desktop sticky nav ---------- */
    function initNav() {
        var bar = document.querySelector(".language-switcher-top");
        if (!bar) return;
        var benefits = document.querySelector("section.benefits");
        if (benefits && !benefits.id) benefits.id = "why-vipo";

        var brand = document.createElement("a");
        brand.className = "wow-brand";
        brand.href = "#";
        brand.textContent = "VIPO";
        brand.addEventListener("click", function (e) { e.preventDefault(); window.scrollTo({ top: 0, behavior: "smooth" }); });

        var nav = document.createElement("nav");
        nav.className = "wow-nav";
        [
            ["#services", "services.title"],
            ["#why-vipo", "whyUs.title"],
            ["#testimonials", "testimonials.title"],
            ["#contact", "contact.title"]
        ].forEach(function (pair) {
            if (!document.querySelector(pair[0])) return;
            var a = document.createElement("a");
            a.href = pair[0];
            a.appendChild(translatableSpan(pair[1]));
            nav.appendChild(a);
        });

        var cta = document.createElement("button");
        cta.type = "button";
        cta.className = "wow-nav-cta wow-magnetic";
        cta.appendChild(iconEl("fas fa-folder-open"));
        cta.appendChild(translatableSpan("ui.newCatalogButton"));
        cta.addEventListener("click", openCatalog);

        bar.insertBefore(nav, bar.firstChild);
        bar.insertBefore(brand, bar.firstChild);
        bar.appendChild(cta);
        bar.classList.add("wow-bar");

        var onScroll = function () { bar.classList.toggle("is-scrolled", window.scrollY > 24); };
        window.addEventListener("scroll", onScroll, { passive: true });
        onScroll();
    }

    /* ---------- Hero aurora + scroll cue ---------- */
    function initAurora() {
        var hero = document.querySelector(".container > header");
        if (!hero) return;
        var aurora = document.createElement("div");
        aurora.className = "wow-aurora";
        aurora.setAttribute("aria-hidden", "true");
        for (var i = 1; i <= 3; i++) {
            var b = document.createElement("span");
            b.className = "wow-blob wow-blob-" + i;
            aurora.appendChild(b);
        }
        hero.insertBefore(aurora, hero.firstChild);

        var cue = document.createElement("a");
        cue.className = "wow-scroll-cue";
        cue.href = "#";
        cue.setAttribute("aria-label", "\u2193");
        cue.appendChild(iconEl("fas fa-chevron-down"));
        cue.addEventListener("click", function (e) {
            e.preventDefault();
            var target = document.querySelector(".intro-container");
            if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
        });
        hero.appendChild(cue);
    }

    /* ---------- Benefits photo ---------- */
    function initBenefitsPhoto() {
        var holder = document.querySelector(".benefits-image .image-container");
        if (!holder) return;
        var img = document.createElement("img");
        img.className = "wow-benefits-photo";
        img.src = "assets/img/port.jpg";
        img.alt = "";
        img.loading = "lazy";
        img.decoding = "async";
        holder.appendChild(img);
        holder.classList.add("wow-photo-frame");
    }

    /* ---------- Closing call-to-action band ---------- */
    function initCta() {
        var footer = document.querySelector("footer.footer-new");
        if (!footer) return;
        var band = document.createElement("div");
        band.className = "wow-cta";
        var inner = document.createElement("div");
        inner.className = "wow-cta-inner";

        var title = document.createElement("h2");
        title.appendChild(translatableSpan("intro.highlight"));
        var sub = document.createElement("p");
        sub.appendChild(translatableSpan("header.slogan"));

        inner.appendChild(title);
        inner.appendChild(sub);
        band.appendChild(inner);
        footer.parentNode.insertBefore(band, footer);
    }

    /* ---------- Desktop pointer effects ---------- */
    function initHover() {
        if (reduceMotion || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

        document.querySelectorAll(".service-card, .testimonial-card, .benefits-list li, .wow-cat").forEach(function (card) {
            card.classList.add("wow-tilt");
            var spot = document.createElement("span");
            spot.className = "wow-spot";
            spot.setAttribute("aria-hidden", "true");
            card.appendChild(spot);
            card.addEventListener("pointermove", function (e) {
                var r = card.getBoundingClientRect();
                var x = (e.clientX - r.left) / r.width;
                var y = (e.clientY - r.top) / r.height;
                card.style.setProperty("--mx", (x * 100).toFixed(1) + "%");
                card.style.setProperty("--my", (y * 100).toFixed(1) + "%");
                card.style.setProperty("--ry", ((x - 0.5) * 6).toFixed(2) + "deg");
                card.style.setProperty("--rx", ((0.5 - y) * 6).toFixed(2) + "deg");
            });
            card.addEventListener("pointerleave", function () {
                card.style.setProperty("--rx", "0deg");
                card.style.setProperty("--ry", "0deg");
            });
        });

        document.querySelectorAll(".catalog-button, .submit-btn").forEach(function (b) { b.classList.add("wow-magnetic"); });
        document.querySelectorAll(".wow-magnetic").forEach(function (b) {
            b.addEventListener("pointermove", function (e) {
                var r = b.getBoundingClientRect();
                var dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2);
                var dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2);
                b.style.setProperty("--mgx", (dx * 6).toFixed(1) + "px");
                b.style.setProperty("--mgy", (dy * 4).toFixed(1) + "px");
            });
            b.addEventListener("pointerleave", function () {
                b.style.setProperty("--mgx", "0px");
                b.style.setProperty("--mgy", "0px");
            });
        });
    }

    /* ---------- Floating-label form ---------- */
    function initForm() {
        document.querySelectorAll("#contact-form .form-group").forEach(function (g) {
            var field = g.querySelector("input, textarea");
            if (!field || !g.querySelector("label")) return;
            g.classList.add("wow-float");
            if (field.tagName === "TEXTAREA") g.classList.add("wow-float-area");
            var sync = function () { g.classList.toggle("is-filled", field.value.trim() !== ""); };
            field.addEventListener("focus", function () { g.classList.add("is-focus"); });
            field.addEventListener("blur", function () { g.classList.remove("is-focus"); sync(); });
            field.addEventListener("input", sync);
            sync();
        });
    }

    /* ---------- Mobile first screen: hero + intro title above the action bar ---------- */
    function initFold() {
        var hero = document.querySelector(".container > header.wow-hero");
        var bar = document.querySelector(".mobile-action-bar");
        var intro = hero && hero.nextElementSibling;
        while (intro && !intro.querySelector(".intro-title")) intro = intro.nextElementSibling;
        var title = intro && intro.querySelector(".intro-title");
        if (!hero || !bar || !title) return;
        var root = document.documentElement;
        var lastW = 0;

        function fit(force) {
            var w = window.innerWidth;
            if (!force && w === lastW) return;
            lastW = w;
            if (w >= 900 || getComputedStyle(bar).display === "none") {
                root.classList.remove("wow-fold");
                return;
            }
            var heroTop = hero.getBoundingClientRect().top + window.scrollY;
            var peek = title.getBoundingClientRect().bottom - intro.getBoundingClientRect().top + 14;
            var h = Math.floor(window.innerHeight - heroTop - bar.offsetHeight - peek);
            if (h < 300) {
                root.classList.remove("wow-fold");
                return;
            }
            root.style.setProperty("--wow-fold", h + "px");
            root.classList.add("wow-fold");
        }

        fit(true);
        window.addEventListener("resize", function () { fit(false); });
        window.addEventListener("orientationchange", function () { setTimeout(function () { fit(true); }, 300); });
        window.addEventListener("load", function () { fit(true); });
        if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () { fit(true); });
    }

    /* ---------- Hero wordmark ---------- */
    function initLogo() {
        var h1 = document.querySelector(".container > header .main-logo");
        if (!h1 || h1.querySelector(".wow-logo-l")) return;
        var word = h1.textContent.trim();
        if (!word) return;
        h1.setAttribute("aria-label", word);
        h1.textContent = "";
        h1.classList.add("wow-logo");
        word.split("").forEach(function (ch, i) {
            var s = document.createElement("span");
            s.className = "wow-logo-l";
            s.setAttribute("aria-hidden", "true");
            s.style.setProperty("--i", i);
            s.textContent = ch;
            if (i === word.length - 1 && /o/i.test(ch)) {
                s.classList.add("wow-logo-o");
                var orbit = document.createElement("span");
                orbit.className = "wow-orbit";
                var spin = document.createElement("span");
                spin.className = "wow-orbit-spin";
                orbit.appendChild(spin);
                s.appendChild(orbit);
            }
            h1.appendChild(s);
        });
        var slogan = document.querySelector(".container > header .header-slogan");
        if (slogan) slogan.classList.add("wow-kicker");
    }

    /* ---------- Netflix-style catalog browser ---------- */
    var LP_COVERS = ["8Qyup", "MZKP3", "hUYAQ", "snhha", "y0Xcx", "Af7eO", "Icq4b", "6Fmy1", "UTYvj",
        "kXZgV", "iNCOx", "oUghk", "Nl1ey", "4Xrbg", "VaSf6", "aIcAa", "kd2BP"];
    var LP_DEAD = ["tdZzu"];

    function coverFor(href, catId) {
        var m = /vipocatalog\.github\.io\/(\d+)\//.exec(href);
        if (m) return "https://vipocatalog.github.io/" + m[1] + "/images/page_1.webp";
        m = /lp6\.me\/([A-Za-z0-9]+)/.exec(href);
        if (m && LP_COVERS.indexOf(m[1]) !== -1) return "assets/img/cat/lp-" + m[1] + ".jpg";
        return "assets/img/cat-" + catId + ".jpg";
    }

    function cloneLabel(src) {
        var s = document.createElement("span");
        if (src.classList.contains("translatable") && src.dataset.key) {
            s.className = "translatable";
            s.setAttribute("data-key", src.dataset.key);
        }
        s.textContent = src.textContent.trim();
        return s;
    }

    function initCatalogBrowser() {
        var sidebar = document.getElementById("catalogSidebar");
        if (!sidebar) return;

        var cats = [];
        sidebar.querySelectorAll(".catalog-category").forEach(function (cat) {
            var h = cat.querySelector("h4");
            var m = /toggleCatalogMenu\('([^']+)'\)/.exec((h && h.getAttribute("onclick")) || "");
            if (!h || !m) return;
            var items = [];
            cat.querySelectorAll(".catalog-items a[href]").forEach(function (a) {
                var href = a.getAttribute("href");
                if (!href || href === "#") return;
                var dead = LP_DEAD.some(function (k) { return href.indexOf("/" + k) !== -1; });
                if (!dead) items.push(a);
            });
            if (items.length) cats.push({ id: m[1], head: h, items: items });
        });
        if (!cats.length) return;

        var root = document.createElement("div");
        root.className = "nfx";
        root.id = "wow-catalogs";
        root.setAttribute("role", "dialog");
        root.setAttribute("aria-modal", "true");
        root.hidden = true;

        var top = document.createElement("div");
        top.className = "nfx-top";
        var brand = document.createElement("span");
        brand.className = "nfx-brand";
        brand.textContent = "VIPO";
        var title = document.createElement("h2");
        title.className = "nfx-title";
        var titleSrc = sidebar.querySelector(".sidebar-header h3");
        if (titleSrc) title.appendChild(cloneLabel(titleSrc));
        var close = document.createElement("button");
        close.type = "button";
        close.className = "nfx-close";
        close.setAttribute("aria-label", "×");
        close.appendChild(iconEl("fas fa-times"));
        top.appendChild(brand);
        top.appendChild(title);
        top.appendChild(close);

        var chipsBar = document.createElement("div");
        chipsBar.className = "nfx-chips";

        var hero = document.createElement("a");
        hero.className = "nfx-hero";
        hero.target = "_blank";
        hero.rel = "noopener";
        var heroBg = document.createElement("div");
        heroBg.className = "nfx-hero-bg";
        var heroBody = document.createElement("div");
        heroBody.className = "nfx-hero-body";
        var heroCat = document.createElement("span");
        heroCat.className = "nfx-hero-cat";
        var heroName = document.createElement("h3");
        heroName.className = "nfx-hero-name";
        var heroPlay = document.createElement("span");
        heroPlay.className = "nfx-hero-play";
        heroPlay.appendChild(iconEl("fas fa-play"));
        heroBody.appendChild(heroCat);
        heroBody.appendChild(heroName);
        heroBody.appendChild(heroPlay);
        hero.appendChild(heroBg);
        hero.appendChild(heroBody);

        var rows = document.createElement("div");
        rows.className = "nfx-rows";

        var featured = [];
        cats.forEach(function (c) {
            var chip = document.createElement("button");
            chip.type = "button";
            chip.className = "nfx-chip";
            chip.appendChild(iconEl("fas " + (CATEGORY_ICONS[c.id] || "fa-box")));
            chip.appendChild(cloneLabel(c.head));
            chip.addEventListener("click", function () { scrollToRow(c.id); });
            chipsBar.appendChild(chip);

            var row = document.createElement("section");
            row.className = "nfx-row";
            row.id = "nfx-row-" + c.id;
            var rh = document.createElement("h3");
            rh.className = "nfx-row-title";
            rh.appendChild(cloneLabel(c.head));
            var count = document.createElement("span");
            count.className = "nfx-row-count";
            count.textContent = c.items.length;
            rh.appendChild(count);

            var wrap = document.createElement("div");
            wrap.className = "nfx-track-wrap";
            var track = document.createElement("div");
            track.className = "nfx-track";

            c.items.forEach(function (a) {
                var href = a.getAttribute("href");
                var card = document.createElement("a");
                card.className = "nfx-card";
                card.href = href;
                card.target = "_blank";
                card.rel = "noopener";
                var img = document.createElement("img");
                img.src = coverFor(href, c.id);
                img.alt = "";
                img.loading = "lazy";
                img.decoding = "async";
                img.onerror = function () {
                    var fb = "assets/img/cat-" + c.id + ".jpg";
                    if (this.getAttribute("src") !== fb) this.src = fb; else this.remove();
                };
                var name = document.createElement("span");
                name.className = "nfx-card-name";
                name.appendChild(cloneLabel(a));
                var go = document.createElement("span");
                go.className = "nfx-card-go";
                go.appendChild(iconEl("fas fa-play"));
                card.appendChild(img);
                card.appendChild(go);
                card.appendChild(name);
                track.appendChild(card);
                if (coverFor(href, c.id).indexOf("assets/img/cat-") !== 0) {
                    featured.push({ href: href, img: coverFor(href, c.id), name: a, cat: c.head });
                }
            });

            ["prev", "next"].forEach(function (dir) {
                var b = document.createElement("button");
                b.type = "button";
                b.className = "nfx-arrow nfx-" + dir;
                b.tabIndex = -1;
                b.setAttribute("aria-hidden", "true");
                b.appendChild(iconEl("fas fa-chevron-" + (dir === "prev" ? "right" : "left")));
                b.addEventListener("click", function () {
                    var rtl = getComputedStyle(track).direction === "rtl";
                    var step = track.clientWidth * 0.85 * (dir === "next" ? 1 : -1);
                    track.scrollBy({ left: rtl ? -step : step, behavior: "smooth" });
                });
                wrap.appendChild(b);
            });
            wrap.insertBefore(track, wrap.firstChild);
            row.appendChild(rh);
            row.appendChild(wrap);
            rows.appendChild(row);
        });

        var body = document.createElement("div");
        body.className = "nfx-body";
        body.appendChild(hero);
        body.appendChild(chipsBar);
        body.appendChild(rows);
        root.appendChild(top);
        root.appendChild(body);
        document.body.appendChild(root);

        var heroIdx = 0, heroTimer = null;
        function showHero(i) {
            if (!featured.length) { hero.hidden = true; return; }
            var f = featured[i % featured.length];
            hero.href = f.href;
            heroBg.style.backgroundImage = 'url("' + f.img + '")';
            heroCat.textContent = "";
            heroCat.appendChild(cloneLabel(f.cat));
            heroName.textContent = "";
            heroName.appendChild(cloneLabel(f.name));
            hero.setAttribute("aria-label", f.name.textContent.trim());
            hero.classList.remove("is-swap");
            void hero.offsetWidth;
            hero.classList.add("is-swap");
        }
        function startHero() {
            stopHero();
            if (featured.length < 2 || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
            heroTimer = setInterval(function () { heroIdx = (heroIdx + 1) % featured.length; showHero(heroIdx); }, 6500);
        }
        function stopHero() { if (heroTimer) clearInterval(heroTimer); heroTimer = null; }

        function scrollToRow(id) {
            var row = document.getElementById("nfx-row-" + id);
            if (!row) return;
            body.scrollTo({ top: row.offsetTop - 12, behavior: "smooth" });
        }

        var lastFocus = null, pushed = false;
        function open(catId) {
            if (!root.hidden) { if (catId) scrollToRow(catId); return; }
            lastFocus = document.activeElement;
            heroIdx = Math.floor(Math.random() * Math.max(featured.length, 1));
            showHero(heroIdx);
            root.hidden = false;
            document.documentElement.classList.add("nfx-open");
            body.scrollTop = 0;
            requestAnimationFrame(function () { root.classList.add("is-open"); });
            try { history.pushState({ nfx: 1 }, ""); pushed = true; } catch (e) { pushed = false; }
            startHero();
            close.focus({ preventScroll: true });
            if (catId) setTimeout(function () { scrollToRow(catId); }, 260);
        }
        function hide(fromPop) {
            if (root.hidden) return;
            stopHero();
            root.classList.remove("is-open");
            document.documentElement.classList.remove("nfx-open");
            setTimeout(function () { root.hidden = true; }, 220);
            if (pushed && !fromPop) { pushed = false; history.back(); }
            pushed = false;
            if (lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
        }

        close.addEventListener("click", function () { hide(false); });
        window.addEventListener("popstate", function () { if (!root.hidden) hide(true); });
        document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !root.hidden) hide(false); });
        hero.addEventListener("mouseenter", stopHero);
        hero.addEventListener("mouseleave", startHero);

        window.wowOpenCatalogs = open;
        window.toggleSidebar = function () { if (root.hidden) open(); else hide(false); };
    }

    function init() {
        var steps = [
            ["catalogs", initCatalogBrowser], ["logo", initLogo],
            ["nav", initNav], ["aurora", initAurora], ["marquee", initMarquee], ["globe", initGlobe],
            ["fold", initFold], ["benefits", initBenefitsPhoto], ["cta", initCta], ["form", initForm],
            ["reveal", initReveal], ["timeline", initTimeline], ["hover", initHover]
        ];
        steps.forEach(function (s) {
            try { s[1](); } catch (e) { console.error("wow " + s[0], e); }
        });
    }

    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
    else init();
})();
