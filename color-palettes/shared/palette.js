(() => {
  "use strict";

  let noticeTimer;

  function showCopyNotice(hex) {
    let notice = document.querySelector(".copy-notice");
    if (!notice) {
      notice = document.createElement("p");
      notice.className = "copy-notice";
      notice.setAttribute("role", "status");
      notice.setAttribute("aria-live", "polite");
      document.body.append(notice);
    }

    notice.textContent = `${hex} をコピーしました`;
    window.clearTimeout(noticeTimer);
    noticeTimer = window.setTimeout(() => notice.remove(), 2800);
  }

  function fallbackCopyText(text) {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.append(textarea);
    textarea.select();
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command was unavailable.");
  }

  async function copyHex(hex) {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(hex);
      } else {
        fallbackCopyText(hex);
      }
      showCopyNotice(hex);
    } catch (error) {
      console.error("HEXのコピーに失敗しました。", error);
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Enter" && event.key !== " ") return;
    const card = event.target.closest(".color-card[data-copy-hex]");
    if (!card) return;
    event.preventDefault();
    copyHex(card.dataset.copyHex);
  });
  document.addEventListener("click", (event) => {
    const target = event.target.closest("[data-copy-hex]");
    if (!target) return;
    copyHex(target.dataset.copyHex);
  });
})();
