/* Curated Portuguese vocabulary, shared by the browser and the server. */
(function (root) {
  const animais = [
    'Panda', 'Coala', 'Pinguim', 'Tucano', 'Golfinho', 'Coelho',
    'Gatinho', 'Cachorrinho', 'Patinho', 'Ursinho', 'Esquilo', 'Castor',
    'Capivara', 'Lontra', 'Foca', 'Baleia', 'Coruja', 'Arara',
    'Canario', 'BeijaFlor', 'Borboleta', 'Joaninha', 'Abelhinha', 'Grilo',
    'Vagalume', 'Caracol', 'Tartaruga', 'Peixinho', 'CavaloMarinho', 'Polvo',
    'Estrelinha', 'Nuvem', 'Cometa', 'Foguetinho', 'Balaozinho', 'Pipa',
    'Gotinha', 'Floco', 'Bolinha', 'Pompom', 'Dino', 'Unicornio',
    'Lhama', 'Alpaca', 'Zebrinha', 'Girafinha', 'Ovelhinha', 'Ponei'
  ];
  const brincadeiras = [
    'Pipoca', 'Confete', 'Bambole', 'PulaPula', 'Amarelinha', 'Ciranda',
    'Purpurina', 'Bolinha', 'Pompom', 'Algodao', 'ArcoIris', 'Caramelo',
    'Biscoito', 'Bolacha', 'Cupcake', 'Sorvete', 'Pudim', 'Paçoca',
    'Gelatina', 'Jujuba', 'Cacau', 'Coco', 'Banana', 'Morango',
    'Melancia', 'Abacaxi', 'Pitanga', 'Goiaba', 'Framboesa', 'Jabuticaba',
    'Risadinha', 'Sorriso', 'Cambalhota', 'Festinha', 'Cantoria', 'Dancinha',
    'Aquarela', 'Rabisco', 'GizDeCera', 'Origami', 'Catavento', 'Balanco'
  ].map(palavra => palavra.normalize('NFD').replace(/[\u0300-\u036f]/g, ''));
  const bases = animais.flatMap(animal => brincadeiras.map(item => animal + item));
  const basesValidas = new Set(bases);
  const total = bases.length * 100;

  function nomeNoIndice(indice) {
    return bases[Math.floor(indice / 100)] + String(indice % 100).padStart(2, '0');
  }

  // A lazy shuffle visits every combination once, without allocating the full pool.
  function criarGerador(aleatorio = Math.random) {
    let restantes = total;
    const trocas = new Map();
    return function proximo() {
      if (!restantes) return null;
      const sorteado = Math.floor(aleatorio() * restantes);
      const indice = trocas.get(sorteado) ?? sorteado;
      restantes--;
      trocas.set(sorteado, trocas.get(restantes) ?? restantes);
      trocas.delete(restantes);
      return nomeNoIndice(indice);
    };
  }

  function valido(nome) {
    return typeof nome === 'string' && /^\d{2}$/.test(nome.slice(-2)) && basesValidas.has(nome.slice(0, -2));
  }

  const api = { criarGerador, valido, total };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.JumpSkyNomes = api;
})(globalThis);
