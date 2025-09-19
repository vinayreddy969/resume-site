/* Butter-smooth, defensive JS. No console logs. */
(() => {
  'use strict';

  const $ = (s, o=document) => o.querySelector(s);
  const $$ = (s, o=document) => Array.from(o.querySelectorAll(s));

  // ----- State
  const state = {
    email: "limba@mywebemails.com",
    phone: "+1 (515) 454-6532",
    resumePath: "assets/Limba_Software_Engineer_Resume.docx",
    onlineEndpoint: "" // set to Formspree/Vercel URL if needed
  };

  // ----- Utilities
  const safe = (fn) => (...a) => { try { return fn(...a); } catch (_) { /* swallow */ } };
  const toast = (msg) => {
    const t = $("#toast"); if (!t) return;
    t.textContent = msg; t.classList.add("show");
    setTimeout(() => t.classList.remove("show"), 1800);
  };
  const copyToClipboard = (text) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => toast("Copied."));
    } else {
      const ta = document.createElement("textarea");
      ta.value = text; document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy"); toast("Copied."); } catch (_) {}
      document.body.removeChild(ta);
    }
  };
  const downloadBlob = (filename, mime, content) => {
    const blob = new Blob([content], { type: mime });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 800);
  };
  const safeOpen = (url) => { const a = document.createElement("a"); a.href = url; a.rel="noopener"; a.target="_blank"; a.click(); };

  // ----- Theme
  const initTheme = safe(() => {
    const html = document.documentElement;
    const btn = $("#themeToggle"); if (!btn) return;
    const saved = localStorage.getItem("theme"); if (saved) html.dataset.theme = saved;
    btn.setAttribute("aria-pressed", html.dataset.theme !== "light" ? "true":"false");
    btn.textContent = html.dataset.theme === "light" ? "Light" : "Dark";
    btn.addEventListener("click", () => {
      const next = html.dataset.theme === "light" ? "dark" : "light";
      html.dataset.theme = next; localStorage.setItem("theme", next);
      btn.textContent = next === "light" ? "Light" : "Dark";
      btn.setAttribute("aria-pressed", next !== "light" ? "true":"false");
      toast(`Theme: ${next}`);
    });
  });

  // ----- Static buttons
  const initStatic = safe(() => {
    const year = $("#year"); if (year) year.textContent = new Date().getFullYear();
    ["#downloadResumeBtn","#ctaDownload"].forEach(sel => {
      const b = $(sel); if (b) b.addEventListener("click", () => safeOpen(state.resumePath));
    });
    const pb = $("#printBtn"); if (pb) pb.addEventListener("click", () => window.print());
    const ce = $("#copyEmail"); if (ce) ce.addEventListener("click", () => copyToClipboard(state.email));
    const cp = $("#copyPhone"); if (cp) cp.addEventListener("click", () => copyToClipboard(state.phone));
    const cas = $("#copyAllSkills"); if (cas) cas.addEventListener("click", () => {
      const skills = $$(".chip").map(c => c.textContent.trim()).join(", "); copyToClipboard(skills);
    });
    const share = $("#shareSite"); if (share) share.addEventListener("click", async () => {
      const data = { title: document.title, text: "Check out Limba's resume site.", url: location.href };
      if (navigator.share) { try { await navigator.share(data); toast("Shared."); } catch (_) {} }
      else copyToClipboard(location.href);
    });
    const vBtn = $("#downloadVCard"); if (vBtn) vBtn.addEventListener("click", () => {
      const v = makeVCard({ name:"Limba Reddy Nagulapally", title:"Software Engineer — Backend & Full-Stack (Java, Spring Boot, AWS, Kafka)",
        email:state.email, phone:state.phone, org:"Independent", url:location.origin+location.pathname, city:"Des Moines", region:"Iowa"});
      downloadBlob("Limba.vcf","text/vcard",v);
    });
  });

  // ----- Contact form
  const initForm = safe(() => {
    const form = $("#contactForm"); if (!form) return;
    const status = $("#formStatus"); const mailto = $("#mailtoFallback");
    const save = $("#saveInquiry");
    if (save) save.addEventListener("click", () => {
      const r = readForm(); const c = r.ok ? `Name: ${r.data.name}\nEmail: ${r.data.email}\nMessage:\n${r.data.message}\n` : "Draft inquiry";
      downloadBlob("inquiry.txt","text/plain",c);
    });
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const r = readForm(); if (!r.ok) { if (status) status.textContent = r.err; return; }
      if ($("#company") && $("#company").value.trim() !== "") { if (status) status.textContent = "Thanks!"; return; }
      if (state.onlineEndpoint) {
        $("#sendBtn") && ($("#sendBtn").disabled = true);
        try {
          const res = await fetch(state.onlineEndpoint, { method:"POST", headers:{ "Content-Type":"application/json" },
            body: JSON.stringify({ name:r.data.name, email:r.data.email, message:r.data.message, ts:new Date().toISOString() })});
          if (res.ok) { if (status) status.textContent = "Message sent. I’ll get back to you."; form.reset(); }
          else { if (status) status.textContent = "Could not send right now. Try mail app."; }
        } catch (_) { if (status) status.textContent = "Network issue. Try mail app."; }
        finally { $("#sendBtn") && ($("#sendBtn").disabled = false); }
      } else {
        const subject = encodeURIComponent("Contact via resume site");
        const body = encodeURIComponent(`Name: ${r.data.name}\nEmail: ${r.data.email}\n\n${r.data.message}`);
        if (mailto) { mailto.href = `mailto:${state.email}?subject=${subject}&body=${body}`; mailto.click(); }
        if (status) status.textContent = "Opened your mail app with a prefilled message.";
      }
    });
    if (mailto) mailto.href = `mailto:${state.email}?subject=${encodeURIComponent("Contact via resume site")}&body=${encodeURIComponent("Name:\nEmail:\n\nMessage:")}`;
  });

  const readForm = () => {
    const name = ($("#name")?.value || "").trim();
    const email = ($("#email")?.value || "").trim();
    const message = ($("#message")?.value || "").trim();
    const ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    if (name.length < 2) return { ok:false, err:"Name is too short." };
    if (!ok) return { ok:false, err:"Enter a valid email." };
    if (message.length < 10) return { ok:false, err:"Message is too short." };
    return { ok:true, data:{ name, email, message } };
  };

  const makeVCard = ({name,title,email,phone,org="Independent",url="",city="",region=""}) => {
    const lines = [
      "BEGIN:VCARD","VERSION:3.0",`N:${name};;;`,`FN:${name}`,`TITLE:${title}`,`ORG:${org}`,
      city||region ? `ADR;TYPE=WORK:;;${city};${region};;;` : "",`TEL;TYPE=CELL:${phone}`,`EMAIL;TYPE=INTERNET:${email}`,url?`URL:${url}`:"","END:VCARD"
    ].filter(Boolean);
    return lines.map(l => l + "\r\n").join("");
  };

  // ----- Animations (parallax, pop-in, 3D tilt, nav spy)
  const initMotion = safe(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Reveal + Stagger
    const toReveal = $$(".card[data-animate], [data-stagger]");
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((entries) => {
        entries.forEach(en => {
          if (en.isIntersecting) {
            en.target.classList.add("in");
            io.unobserve(en.target);
          }
        });
      }, { threshold:.15 });
      toReveal.forEach(el => { el.classList.add("reveal"); io.observe(el); });
    } else {
      toReveal.forEach(el => el.classList.add("in"));
    }

    // Parallax hero + brand spin
    const hero = $(".hero[data-parallax='true']");
    const bg = hero ? $(".hero-bg", hero) : null;
    const brand = $("#brandMark");
    let lastY = 0, ticking = false;
    const onScroll = () => {
      lastY = window.scrollY || window.pageYOffset;
      if (!ticking) {
        requestAnimationFrame(() => {
          ticking = false;
          if (!reduce) {
            if (bg) {
              const d = Math.min(1, lastY / 700);
              bg.style.transform = `translate3d(0, ${d*40}px, 0)`;
            }
            if (brand) {
              brand.style.transform = `rotate(${(lastY % 360)}deg)`;
            }
          }
          spy();
        });
        ticking = true;
      }
    };
    window.addEventListener("scroll", onScroll, { passive:true });
    onScroll();

    // 3D tilt on cards
    if (!reduce) {
      $$(".tilt").forEach(card => {
        let rid = 0;
        const move = (e) => {
          const r = card.getBoundingClientRect();
          const x = (e.clientX - r.left) / r.width - .5;
          const y = (e.clientY - r.top) / r.height - .5;
          cancelAnimationFrame(rid);
          rid = requestAnimationFrame(() => {
            card.style.transform = `perspective(900px) rotateX(${y*-4}deg) rotateY(${x*6}deg)`;
          });
        };
        const reset = () => { card.style.transform = "none"; };
        card.addEventListener("mousemove", move);
        card.addEventListener("mouseleave", reset);
        card.addEventListener("blur", reset);
      });
    }

    // Nav spy
    const secs = ["summary","skills","experience","education","contact"].map(id => ({ id, el: $("#"+id) })).filter(s => s.el);
    const spy = () => {
      let current = null;
      const y = window.scrollY + (window.innerHeight * .35);
      for (const s of secs) {
        const top = s.el.getBoundingClientRect().top + window.scrollY;
        if (y >= top) current = s.id;
      }
      $$(".nav a").forEach(a => a.removeAttribute("aria-current"));
      if (current) {
        const link = document.querySelector(`.nav a[href="#${current}"]`);
        if (link) link.setAttribute("aria-current","true");
      }
    };
  });

  // ----- PWA (safe no-op on file://)
  const initPWA = safe(() => {
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(() => {});
      });
    }
  });

  // Boot
  initTheme();
  initStatic();
  initForm();
  initMotion();
  initPWA();
})();