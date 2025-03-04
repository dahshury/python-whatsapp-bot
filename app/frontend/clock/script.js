const hourMarkersContainer = document.querySelector('.hour-markers');
for (let i = 0; i < 12; i++) {
  const marker = document.createElement('div');
  marker.classList.add('hour-marker');
  
  const rotation = i * 30;
  marker.style.setProperty('--rotation', `${rotation}deg`);
  
  const hourText = document.createElement('span');
  hourText.textContent = i === 0 ? '12' : i;
  hourText.style.transform = `rotate(-${rotation}deg)`; //fix: angka tanpa rotasi
  marker.appendChild(hourText);
  
  hourMarkersContainer.appendChild(marker);
}

//fix: garis 5 menit
const minuteMarkersContainer = document.querySelector('.minute-markers');
for (let i = 0; i < 60; i++) {
  if (i % 5 !== 0) {
    const marker = document.createElement('div');
    marker.classList.add('minute-marker');
    marker.style.setProperty('--rotation', `${i * 6}deg`);
    minuteMarkersContainer.appendChild(marker);
  }
}

const hourHand = document.querySelector(".hour-hand");
const minuteHand = document.querySelector(".minute-hand");
const secondHand = document.querySelector(".second-hand");

function setClock() {
  const now = new Date();
  const seconds = now.getSeconds() + now.getMilliseconds() / 1000;
  const minutes = now.getMinutes() + seconds / 60;
  const hours = now.getHours() % 12 + minutes / 60;

  const secondsDeg = (seconds / 60) * 360;
  const minutesDeg = (minutes / 60) * 360;
  const hoursDeg = (hours / 12) * 360;

  hourHand.style.transform = `rotate(${hoursDeg}deg)`;
  minuteHand.style.transform = `rotate(${minutesDeg}deg)`;
  secondHand.style.transform = `rotate(${secondsDeg}deg)`;
}

setInterval(setClock, 50);
setClock();