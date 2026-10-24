// Change a file name here if your picture is named differently.
const IMAGE_FILES = {
  mom: "mom.jpg",
  homeBg: "home-bg.jpg",
  gameBg: "home-bg.jpg",
  ship: "ship.png",
  rock: "rock.png",
  pumpkin: "pumpkin.png"
};
// Resolves to the image, or null if the file is not in the images folder.
function loadImage(key) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = "images/" + IMAGE_FILES[key];
  });
}
