// Leave warning
      window.onbeforeunload = () => "Are you sure you want to leave? Your session may be interrupted.";

      // Static Menu show/hide with 3 minute return
      (function(){
        const menu = document.getElementById("staticMenu");
        const btn  = document.getElementById("closeStaticMenu");
        const KEY  = "sq931_staticMenu_hidden_until";
        const show = () => { if (menu) menu.style.display = "flex"; };
        const hideFor3m = () => {
          if (!menu) return;
          menu.style.display = "none";
          const until = Date.now() + 180000;
          localStorage.setItem(KEY, String(until));
          setTimeout(show, 180000);
        };
        const until = parseInt(localStorage.getItem(KEY) || "0", 10);
        if (until && Date.now() < until){
          if (menu) menu.style.display = "none";
          setTimeout(show, until - Date.now());
        } else {
          show();
        }
        if (btn) btn.onclick = hideFor3m;
      })();

      // Rotator: Google Form → Discord → Instagram
      (function(){
        const wrap = document.getElementById("staticSlideMenu");
        const a    = document.getElementById("staticSlideLink");
        const img  = document.getElementById("staticSlideImg");

        const FORM = {
          src:  "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/GoogleForm.png",
          alt:  "StaticQuasar931 Google Form for feedback and requests",
          link: "https://sites.google.com/view/staticquasar931/google-form"
        };
        const DISCORD = {
          src:  "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/Join_Our_DC_StaticQuassar931_lcplrf.png",
          alt:  "Join the StaticQuasar931 Discord",
          link: "https://discord.gg/DP2hM7RRhR"
        };
        const INSTA = {
          src:  "https://cdn.jsdelivr.net/gh/StaticQuasar931/Images@main/Follow-us--IG",
          alt:  "StaticQuasar931 Instagram",
          link: "https://www.instagram.com/freeschoolgamepage/"
        };
        const ROTATION = [FORM, DISCORD, INSTA];

        // Preload
        ROTATION.forEach(o => { const p = new Image(); p.src = o.src; });

        const T_IN = 2000, T_SHOW = 5000, T_OUT = 2000, T_HIDDEN = 20000;
        let idx = 0;

        function apply(state){
          a.href = state.link;
          img.alt = state.alt;
          img.style.opacity = "0";
          setTimeout(() => { img.src = state.src; }, 80);
          img.onload = () => { img.style.opacity = "1"; };
        }
        function delay(ms){ return new Promise(r => setTimeout(r, ms)); }

        (async function cycle(){
          for(;;){
            apply(ROTATION[idx]);
            wrap.style.pointerEvents = "auto";
            wrap.classList.remove("slide-out");
            wrap.classList.add("slide-in");
            await delay(T_IN + T_SHOW);
            wrap.classList.remove("slide-in");
            wrap.classList.add("slide-out");
            await delay(T_OUT);
            wrap.style.pointerEvents = "none";
            await delay(T_HIDDEN);
            idx = (idx + 1) % ROTATION.length;
          }
        })();
      })();

      // Keyboard secret toggle: y + u + i to toggle all Visual SEO
      (function(){
        const idsToToggle = ["staticMenu", "staticSlideMenu"];
        let seq = [];
        const target = ["y","u","i"];
        function toggle(){
          idsToToggle.forEach(id=>{
            const el = document.getElementById(id);
            if(!el) return;
            const isHidden = (el.style.display === "none" || getComputedStyle(el).display === "none");
            el.style.display = isHidden ? (id === "staticMenu" ? "flex" : "block") : "none";
          });
        }
        window.addEventListener("keydown", (e)=>{
          seq.push(String(e.key || "").toLowerCase());
          if (seq.length > 3) seq.shift();
          if (seq.join("") === target.join("")) toggle();
        });
      })();
