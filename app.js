const source = document.getElementById("langue-source");
const cible = document.getElementById("langue-cible");
const inverser = document.getElementById("inverser");

// Restaurer les langues choisies lors de la dernière visite
try {
  source.value = localStorage.getItem("langue-source") || source.value;
  cible.value = localStorage.getItem("langue-cible") || cible.value;
} catch (e) {}

function sauvegarder() {
  try {
    localStorage.setItem("langue-source", source.value);
    localStorage.setItem("langue-cible", cible.value);
  } catch (e) {}
}

source.addEventListener("change", sauvegarder);
cible.addEventListener("change", sauvegarder);

inverser.addEventListener("click", () => {
  const temp = source.value;
  source.value = cible.value;
  cible.value = temp;
  sauvegarder();
});
