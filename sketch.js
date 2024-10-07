// Classifier Variable
let classifier;
// Model URL
let imageModelURL = "https://teachablemachine.withgoogle.com/models/DNPhdaXam/";

// Video
let video;
// To store the classification
let etiqueta = "";
let confianza = 0;
let gatos = [];
let spawnInterval = 2000; // Intervalo para generar monstruos (en milisegundos)
let lastSpawnTime = 0;
let shoot = false;

let shotX;
let shotY;

// Shooter (Triángulo)
let shooterY = 0;
let shooterSpeed = 6;

// Array para almacenar los disparos
let shots = [];

// Load the model first
function preload() {
  classifier = ml5.imageClassifier(imageModelURL + "model.json");
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  // Create the video
  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight);
  video.hide();

  // Start classifying
  classifyVideo();
}

// Clase que define el comportamiento de los monstruos
class Monster {
  constructor() {
    this.size = 50;
    this.x = width + this.size; // Inicia fuera de la pantalla por la derecha
    this.y = random(this.size, height - this.size);
    this.speed = random(2, 5);
  }

  update() {
    this.x -= this.speed; // Mueve el monstruo hacia la izquierda
  }

  show() {
    // Dibujo del monstruo (Gato)
    // Cola
    noFill();
    arc(this.x + 40, this.y - 30, 70, 70, 0, HALF_PI);

    // Cuerpo
    fill(255);
    noStroke();
    ellipse(this.x, this.y, 80, 60);

    // Ojos
    stroke(0);
    strokeWeight(5);
    point(this.x - 25, this.y - 5);
    point(this.x - 7, this.y - 5);

    // Nariz
    point(this.x - 17, this.y);

    // Orejas
    strokeWeight(3);
    triangle(
      this.x - 35,
      this.y - 25,
      this.x - 25,
      this.y - 25,
      this.x - 30,
      this.y - 40
    );
    triangle(
      this.x + 5,
      this.y - 25,
      this.x - 5,
      this.y - 25,
      this.x,
      this.y - 40
    );

    // Cejas
    line(this.x - 15, this.y - 10, this.x - 30, this.y - 20);
    line(this.x - 15, this.y - 10, this.x + 0, this.y - 20);

    // Boca
    stroke(1);
    strokeWeight(3);
    rect(this.x - 25, this.y + 8, 20, 9, 5);

    // Bigotes
    line(this.x - 40, this.y - 5, this.x - 30, this.y);
    line(this.x - 40, this.y + 21, this.x - 30, this.y + 16);
    line(this.x - 40, this.y + 8, this.x - 30, this.y + 8);
    line(this.x + 13, this.y - 5, this.x, this.y);
    line(this.x + 15, this.y + 10, this.x, this.y + 8);
    line(this.x, this.y + 15, this.x + 10, this.y + 21);
  }

  offscreen() {
    return this.x < -this.size; // Verifica si ha salido por la izquierda
  }
}

// Clase que define el comportamiento de los disparos
class Shot {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.speed = 10; // Velocidad del disparo
    this.size = 10;
  }

  update() {
    this.x += this.speed; // Mover hacia arriba
  }

  show() {
    fill(0, 255, 0);
    noStroke();
    ellipse(this.x, this.y, this.size, this.size);
  }

  offscreen() {
    return this.y < 0;
  }
}

function draw() {
  background(255);
  // Draw the video
  image(video, 0, 0, windowWidth, windowHeight);

  // Mostrar etiqueta y confianza
  fill(0);
  textSize(16);
  textAlign(CENTER, TOP);
  text(`Etiqueta: ${etiqueta}`, width / 2, 10);
  text(`Confianza: ${(confianza * 100).toFixed(2)}%`, width / 2, 30);

  // *** Dibujar y mover el triángulo (shooter)
  fill(0, 0, 0);
  noStroke();
  push();
  translate(50, shooterY); // Posición del triángulo en la parte izquierda
  triangle(0, 0, 0, 30, 30, 15); // Triángulo apuntando hacia la derecha
  pop();

  shooterY += shooterSpeed; // Mueve el triángulo hacia abajo

  // *** Rebotar el triángulo al llegar al final de la pantalla
  if (shooterY > height || shooterY < 0) {
    shooterSpeed *= -1;
  }

  // Generar monstruos en intervalos definidos
  if (millis() - lastSpawnTime > spawnInterval) {
    gatos.push(new Monster());
    lastSpawnTime = millis();
  }

  // Actualizar y mostrar monstruos
  for (let i = gatos.length - 1; i >= 0; i--) {
    gatos[i].update();
    gatos[i].show();

    // Verificar si el gato ha salido de la pantalla
    if (gatos[i].offscreen()) {
      endGame();
    }

    // Verificar colisión con disparos
    for (let j = shots.length - 1; j >= 0; j--) {
      let d = dist(shots[j].x, shots[j].y, gatos[i].x, gatos[i].y);
      if (d < gatos[i].size / 2) {
        gatos.splice(i, 1);
        shots.splice(j, 1);
        // Opcional: Incrementar puntuación o efectos visuales
        break;
      }
    }
  }

  // *** Actualizar y mostrar disparos
  for (let i = shots.length - 1; i >= 0; i--) {
    shots[i].update();
    shots[i].show();

    if (shots[i].offscreen()) {
      shots.splice(i, 1);
    }
  }

  // Dibujar disparos si se ha realizado
  // *** No es necesario dibujar disparos aquí ya que se manejan en el array 'shots'
}

// Get a prediction for the current video frame
function classifyVideo() {
  classifier.classify(video, gotResult);
}

// When we get a result
function gotResult(results, error) {
  // If there is an error
  if (error) {
    console.error(error);
    return;
  }

  // The results are in an array ordered by confidence.
  etiqueta = results[0].label;
  confianza = results[0].confidence;

  // *** Detectar disparo basado en la etiqueta
  if (etiqueta === "disparo") {
    // Asegúrate de que 'disparo' es la etiqueta correcta
    // *** Obtener la posición de la punta del triángulo
    let shooterTipX = 50 + 30; // Posición X del triángulo + base del triángulo
    let shooterTipY = shooterY + 15; // Posición Y del triángulo + mitad de la altura del triángulo

    // *** Crear un nuevo disparo desde la punta del triángulo
    shots.push(new Shot(shooterTipX, shooterTipY));
  }

  // Classify again!
  classifyVideo();
}

// Función para finalizar el juego
function endGame() {
  noLoop(); // Detiene el ciclo de dibujo
  background(0);
  fill(255, 0, 0);
  textSize(50);
  textAlign(CENTER, CENTER);
  text("¡Juego Terminado!", width / 2, height / 2);
}
