const sprite = document.createElementNS("http://www.w3.org/2000/svg", "svg");
sprite.setAttribute("aria-hidden", "true");
sprite.style.cssText = "position:absolute;width:0;height:0;overflow:hidden";
sprite.innerHTML = window.solkanIcons;
document.body.append(sprite);
function gameIcon(svg, name) {
  svg.setAttribute("viewBox", "0 0 512 512");
  svg.classList.add("game-icon");
  svg.innerHTML = '<use href="#gi-' + name + '"/>';
}
document.querySelectorAll(".card-heading>svg").forEach((svg,i) => gameIcon(svg, ["bow","dart","swords","mark"][i]));
document.querySelectorAll("[data-pip] svg").forEach(svg => gameIcon(svg, {slots:"slot", mark:"mark", dice:"die"}[svg.closest("button").dataset.pip]));
document.querySelectorAll("[data-death]").forEach(button => {
  const success = button.dataset.death === "deathSuccess";
  gameIcon(button.querySelector(":scope>svg"), success ? "leaf" : "skull");
  button.querySelectorAll(".death-fx svg").forEach(svg => gameIcon(svg, success ? "leaf" : "flame"));
});
for (const [selector, name] of [["#short button","short"],["#long","long"]]) {
  const button = document.querySelector(selector);
  const svg = document.createElementNS("http://www.w3.org/2000/svg","svg");
  svg.setAttribute("aria-hidden","true");
  gameIcon(svg,name);
  button.prepend(svg);
}
