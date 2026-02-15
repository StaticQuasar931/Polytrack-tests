(() => {
  const BUTTON_ID = "injected-leaderboard-button";
  const MODAL_ID = "injected-leaderboard-modal";

  function ensureStyles() {
    if (document.getElementById("injected-leaderboard-style")) return;
    const style = document.createElement("style");
    style.id = "injected-leaderboard-style";
    style.textContent = `
      .injected-leaderboard-modal {
        position: fixed;
        inset: 0;
        z-index: 9999;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(6, 11, 30, 0.72);
      }
      .injected-leaderboard-card {
        width: min(90vw, 520px);
        border-radius: 16px;
        border: 1px solid rgba(255, 255, 255, 0.2);
        background: rgba(15, 26, 56, 0.95);
        box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
        color: #e6edf7;
        padding: 18px;
        font-family: Arial, sans-serif;
      }
      .injected-leaderboard-card h3 {
        margin: 0 0 10px;
      }
      .injected-leaderboard-card p {
        margin: 8px 0;
        line-height: 1.35;
        opacity: 0.95;
      }
      .injected-leaderboard-actions {
        margin-top: 14px;
        display: flex;
        gap: 10px;
        justify-content: flex-end;
      }
      .injected-leaderboard-actions button {
        border: 1px solid rgba(255, 255, 255, 0.25);
        border-radius: 10px;
        background: rgba(255, 255, 255, 0.06);
        color: #fff;
        padding: 8px 12px;
        cursor: pointer;
      }
    `;
    document.head.appendChild(style);
  }

  function showModal() {
    if (document.getElementById(MODAL_ID)) return;
    ensureStyles();

    const overlay = document.createElement("div");
    overlay.id = MODAL_ID;
    overlay.className = "injected-leaderboard-modal";

    const card = document.createElement("div");
    card.className = "injected-leaderboard-card";
    card.innerHTML = `
      <h3>Leaderboard (Beta)</h3>
      <p>This menu button is now injected as requested.</p>
      <p>Next step: wire this to your API-backed global + average leaderboards with moderation support.</p>
      <div class="injected-leaderboard-actions">
        <button id="close-injected-leaderboard">Close</button>
      </div>
    `;

    overlay.addEventListener("click", (event) => {
      if (event.target === overlay) overlay.remove();
    });

    card.querySelector("#close-injected-leaderboard")?.addEventListener("click", () => {
      overlay.remove();
    });

    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  function injectButton() {
    const container = document.querySelector(".main-buttons-container");
    if (!container || document.getElementById(BUTTON_ID)) return;

    const button = document.createElement("button");
    button.id = BUTTON_ID;
    button.className = "button button-image";
    button.innerHTML = '<img src="images/trophy.svg" alt="Leaderboard">';

    const label = document.createElement("p");
    label.textContent = "Leaderboard";
    button.appendChild(label);

    button.addEventListener("click", (event) => {
      event.preventDefault();
      event.stopPropagation();
      showModal();
    });

    const playButton = Array.from(container.querySelectorAll("button")).find((candidate) =>
      /play/i.test(candidate.textContent || "")
    );

    if (playButton && playButton.nextSibling) {
      container.insertBefore(button, playButton.nextSibling);
    } else {
      container.appendChild(button);
    }
  }

  const observer = new MutationObserver(() => injectButton());
  observer.observe(document.documentElement, { childList: true, subtree: true });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", injectButton, { once: true });
  } else {
    injectButton();
  }
})();
