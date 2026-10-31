(() => {
  // Run in <head>, before fragment navigation and native scroll restoration.
  if ("scrollRestoration" in history) history.scrollRestoration = "manual";
  if (["#schedule", "#tasks", "#meals", "#memo"].includes(location.hash)) {
    history.replaceState(history.state, "", location.pathname + location.search);
  }

  // Also handles a document restored from the back/forward cache. Do not reset
  // on visibilitychange: returning to another app must preserve ongoing edits.
  window.addEventListener("pageshow", () => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  });
})();
