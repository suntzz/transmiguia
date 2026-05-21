export type BusRoute = {
  ruta: string;
  tipo: string;
  origen: string;
  destino: string;
  paradas: string[];
};

export const allRoutes: BusRoute[] = [
  // Rutas K
  {
    "ruta": "1",
    "tipo": "Ruta Fácil",
    "origen": "Portal Eldorado",
    "destino": "Universidades",
    "paradas": [
      "Portal Eldorado", "Modelia", "Normandía", "Avenida Rojas", "El Tiempo - Maloka", 
      "CAN", "Gobernación", "Quinta Paredes", "Corferias", "Ciudad Universitaria", 
      "Concejo de Bogotá", "Centro Memoria", "Universidades"
    ]
  },
  {
    "ruta": "K10",
    "tipo": "Expreso",
    "origen": "Portal 20 de Julio",
    "destino": "Portal Eldorado",
    "paradas": [
      "Portal 20 de Julio", "Av. 1° de Mayo", "San Victorino", "Las Nieves", "San Diego", 
      "Concejo de Bogotá", "Ciudad Universitaria", "Corferias", "Gobernación", 
      "CAN", "El Tiempo - Maloka", "Avenida Rojas", "Modelia", "Portal Eldorado"
    ]
  },
  {
    "ruta": "K16",
    "tipo": "Expreso",
    "origen": "Portal Norte",
    "destino": "Portal Eldorado",
    "paradas": [
      "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 146", "Calle 142", 
      "Prado", "Calle 127", "Pepe Sierra", "Calle 106", "Calle 100", "Virrey", 
      "Calle 85", "Héroes", "Calle 76", "Calle 72", "Calle 63", "Calle 57", 
      "Marly", "Calle 45", "Av. 39", "Concejo de Bogotá", "Ciudad Universitaria", 
      "Corferias", "Gobernación", "CAN", "El Tiempo - Maloka", "Avenida Rojas", 
      "Modelia", "Portal Eldorado"
    ]
  },
  {
    "ruta": "K23",
    "tipo": "Expreso",
    "origen": "Alcalá",
    "destino": "Portal Eldorado",
    "paradas": [
      "Alcalá", "Prado", "Calle 127", "Calle 106", "Calle 100", "Calle 85", 
      "Calle 76", "Calle 72", "Calle 57", "Calle 45", "Concejo de Bogotá", 
      "Ciudad Universitaria", "Corferias", "Gobernación", "CAN", 
      "El Tiempo - Maloka", "Avenida Rojas", "Modelia", "Portal Eldorado"
    ]
  },
  {
    "ruta": "K43",
    "tipo": "Expreso",
    "origen": "San Mateo",
    "destino": "Portal Eldorado",
    "paradas": [
      "San Mateo", "Terreros", "Venecia", "General Santander", "NQS - Calle 30 Sur", 
      "Guatoque - Veraguas", "Ricaurte (NQS)", "Concejo de Bogotá", 
      "Ciudad Universitaria", "Corferias", "Gobernación", "CAN", 
      "El Tiempo - Maloka", "Avenida Rojas", "Modelia", "Portal Eldorado"
    ]
  },
  {
    "ruta": "K54",
    "tipo": "Expreso",
    "origen": "Portal Sur",
    "destino": "Portal Eldorado",
    "paradas": [
      "Portal Sur", "Perdomo", "Madelena", "Sevillana", "Venecia", "Alquería", 
      "General Santander", "Calle 40 Sur", "Quiroga", "Olaya", "Av. 1° de Mayo", 
      "Fucha", "Restrepo", "Hortúa", "Hospital", "Tercer Milenio", 
      "Concejo de Bogotá", "Ciudad Universitaria", "Corferias", "Gobernación", 
      "CAN", "El Tiempo - Maloka", "Avenida Rojas", "Modelia", "Portal Eldorado"
    ]
  },
  {
    "ruta": "K86",
    "tipo": "Dual",
    "origen": "Hacienda Santa Bárbara",
    "destino": "Portal Eldorado",
    "paradas": [
      "Cr 7 - Cl 116", "Cr 7 - Cl 94", "Cr 7 - Cl 82", "Cr 7 - Cl 72", "Cr 7 - Cl 67", 
      "Cr 7 - Cl 53", "Cr 7 - Cl 45", "Cr 7 - Cl 32", "Cl 26 - Cr 19", "Cl 26 - Cr 33", 
      "Concejo de Bogotá", "Ciudad Universitaria", "Corferias", "Gobernación", 
      "CAN", "El Tiempo - Maloka", "Avenida Rojas", "Modelia", "Portal Eldorado"
    ]
  },
  // Rutas A y D
  {
    "ruta": "A15",
    "tipo": "Expreso",
    "origen": "Portal Sur",
    "destino": "Calle 76 - San Felipe",
    "paradas": [
      "Portal Sur", "Perdomo", "Madelena", "Sevillana", "Venecia", "Alquería", 
      "General Santander", "Calle 40 Sur", "Quiroga", "Olaya", "Restrepo", 
      "Hortúa", "Hospital", "Tercer Milenio", "Calle 19", "Calle 22", 
      "Calle 34", "Avenida 39", "Calle 45", "Marly", "Calle 57", "Calle 76 - San Felipe"
    ]
  },
  {
    "ruta": "A60",
    "tipo": "Expreso",
    "origen": "Portal Tunal",
    "destino": "Calle 76 - San Felipe",
    "paradas": [
      "Portal Tunal", "Parque", "Biblioteca", "Calle 40 Sur", "Quiroga", "Olaya", 
      "Restrepo", "Hortúa", "Hospital", "Tercer Milenio", "Calle 19", 
      "Calle 22", "Calle 34", "Avenida 39", "Calle 45", "Marly", "Calle 57", "Calle 76 - San Felipe"
    ]
  },
  {
    "ruta": "A61",
    "tipo": "Expreso",
    "origen": "Portal Usme",
    "destino": "Calle 76 - San Felipe",
    "paradas": [
      "Portal Usme", "Molinos", "Socorro", "Consuelo", "Olaya", "Restrepo", 
      "Hortúa", "Hospital", "Tercer Milenio", "Calle 19", "Calle 22", 
      "Calle 34", "Avenida 39", "Calle 45", "Marly", "Calle 57", "Calle 76 - San Felipe"
    ]
  },
  {
    "ruta": "6",
    "tipo": "Ruta Fácil",
    "origen": "Portal 80",
    "destino": "Universidades",
    "paradas": [
      "Portal 80", "Quirigua", "Carrera 90", "Avenida Cali", "Granja - Carrera 77", 
      "Minuto de Dios", "Avenida 68", "Ferias", "Avenida Chile", "Carrera 53", 
      "Carrera 47", "Escuela Militar", "Polo", "Centro Memoria", "Universidades"
    ]
  },
  {
    "ruta": "D10",
    "tipo": "Expreso",
    "origen": "Portal Eldorado",
    "destino": "Portal 80",
    "paradas": [
      "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", "CAN", 
      "Gobernación", "Corferias", "Ciudad Universitaria", "Concejo de Bogotá", 
      "Calle 45", "Marly", "Calle 57", "Polo", "Escuela Militar", "Avenida Chile", 
      "Avenida 68", "Granja - Carrera 77", "Avenida Cali", "Portal 80"
    ]
  },
  {
    "ruta": "D20",
    "tipo": "Expreso",
    "origen": "Portal Usme",
    "destino": "Portal 80",
    "paradas": [
      "Portal Usme", "Molinos", "Calle 40 Sur", "Olaya", "Restrepo", "Hospital", 
      "Calle 19", "Calle 22", "Calle 34", "Calle 45", "Marly", "Calle 57", 
      "Calle 76 - San Felipe", "Polo", "Escuela Militar", "Carrera 47", 
      "Avenida 68", "Ferias", "Avenida Cali", "Portal 80"
    ]
  },
  {
    "ruta": "D21",
    "tipo": "Expreso",
    "origen": "Portal Tunal",
    "destino": "Portal 80",
    "paradas": [
      "Portal Tunal", "Parque", "Biblioteca", "Calle 40 Sur", "Olaya", "Restrepo", 
      "Calle 19", "Calle 22", "Calle 34", "Calle 45", "Marly", "Calle 57", 
      "Calle 76 - San Felipe", "Polo", "Escuela Militar", "Avenida Chile", 
      "Avenida 68", "Granja - Carrera 77", "Avenida Cali", "Portal 80"
    ]
  },
  {
    "ruta": "D22",
    "tipo": "Expreso",
    "origen": "Portal Sur",
    "destino": "Portal 80",
    "paradas": [
      "Portal Sur", "Perdomo", "Madelena", "Sevillana", "Venecia", "Alquería", 
      "General Santander", "SENA", "Ricaurte (NQS)", "Paloquemao", "CAD", 
      "Avenida El Dorado", "Campín - U. Antonio Nariño", "Movistar Arena", 
      "NQS - Calle 75", "Escuela Militar", "Carrera 47", "Avenida 68", "Ferias", 
      "Avenida Cali", "Portal 80"
    ]
  },
  {
    "ruta": "D24",
    "tipo": "Expreso",
    "origen": "Portal 80",
    "destino": "Alcalá",
    "paradas": [
      "Portal 80", "Avenida Cali", "Granja - Carrera 77", "Minuto de Dios", 
      "Avenida 68", "Ferias", "Avenida Chile", "Escuela Militar", "Polo", 
      "Calle 76 - San Felipe", "Calle 85", "Virrey", "Calle 100", "Calle 106", 
      "Pepe Sierra", "Calle 127", "Prado", "Alcalá"
    ]
  },
  {
    "ruta": "D81",
    "tipo": "Dual",
    "origen": "Museo Nacional",
    "destino": "Portal 80",
    "paradas": [
      "Museo Nacional", "San Diego", "Calle 34", "Avenida 39", "Calle 45", "Marly", 
      "Calle 57", "Calle 76 - San Felipe", "Polo", "Escuela Militar", "Avenida Chile", 
      "Ferias", "Avenida 68", "Minuto de Dios", "Granja - Carrera 77", 
      "Avenida Cali", "Carrera 90", "Quirigua", "Portal 80"
    ]
  },
  // Rutas G
  {
    "ruta": "G11",
    "tipo": "Expreso",
    "origen": "Terminal Norte",
    "destino": "Portal Sur",
    "paradas": [
      "Terminal", "Calle 187", "Portal Norte", "Calle 146", "Mazurén", "Prado", 
      "Calle 127", "Calle 100", "Virrey", "Castellana", "NQS - Calle 75", 
      "Avenida El Dorado", "CAD", "Ricaurte (NQS)", "Guatoque - Veraguas", 
      "NQS - Calle 30 Sur", "General Santander", "Alquería", "Venecia", 
      "Sevillana", "Madelena", "Perdomo", "Portal Sur"
    ]
  },
  {
    "ruta": "G12",
    "tipo": "Expreso",
    "origen": "Portal Norte",
    "destino": "Portal Sur",
    "paradas": [
      "Portal Norte", "Calle 161", "Calle 142", "Alcalá", "Calle 106", 
      "Calle 100", "Calle 85", "Virrey", "NQS - Calle 75", "Avenida El Dorado", 
      "Universidad Nacional", "CAD", "Ricaurte (NQS)", "Comuneros", 
      "SENA", "General Santander", "Alquería", "Sevillana", "Madelena", "Portal Sur"
    ]
  },
  {
    "ruta": "G22",
    "tipo": "Expreso",
    "origen": "Portal Eldorado",
    "destino": "Portal Sur",
    "paradas": [
      "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", 
      "CAN", "Gobernación", "Corferias", "Ciudad Universitaria", 
      "Concejo de Bogotá", "Ricaurte (NQS)", "SENA", "General Santander", 
      "Sevillana", "Madelena", "Perdomo", "Portal Sur"
    ]
  },
  {
    "ruta": "G30",
    "tipo": "Expreso",
    "origen": "Portal Norte",
    "destino": "Portal Sur",
    "paradas": [
      "Portal Norte", "Calle 161", "Calle 146", "Mazurén", "Calle 106", 
      "Calle 100", "NQS - Calle 75", "Avenida El Dorado", "Universidad Nacional", 
      "Ricaurte (NQS)", "NQS - Calle 30 Sur", "General Santander", 
      "Venecia", "Sevillana", "Madelena", "Portal Sur"
    ]
  },
  {
    "ruta": "G41",
    "tipo": "Expreso",
    "origen": "Portal 80",
    "destino": "San Mateo",
    "paradas": [
      "Portal 80", "Avenida Cali", "Granja - Carrera 77", "Avenida 68", 
      "Carrera 47", "Escuela Militar", "Ricaurte (NQS)", "Guatoque - Veraguas", 
      "NQS - Calle 30 Sur", "General Santander", "Venecia", "Terreros", "San Mateo"
    ]
  },
  {
    "ruta": "G42",
    "tipo": "Expreso",
    "origen": "Portal Suba",
    "destino": "San Mateo",
    "paradas": [
      "Portal Suba", "21 Ángeles", "Suba - Avenida Boyacá", "Niza - Calle 127", 
      "Suba - Calle 100", "NQS - Calle 75", "Ricaurte (NQS)", "SENA", 
      "General Santander", "Venecia", "Terreros", "San Mateo"
    ]
  },
  {
    "ruta": "G43",
    "tipo": "Expreso",
    "origen": "Portal Eldorado",
    "destino": "San Mateo",
    "paradas": [
      "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", 
      "CAN", "Gobernación", "Corferias", "Ciudad Universitaria", 
      "Concejo de Bogotá", "Ricaurte (NQS)", "Guatoque - Veraguas", 
      "NQS - Calle 30 Sur", "General Santander", "Venecia", "Terreros", "San Mateo"
    ]
  },
  // Rutas C
  {
      "ruta": "7",
      "tipo": "Ruta Fácil",
      "origen": "Portal Suba",
      "destino": "Santa Isabel",
      "paradas": [
        "Portal Suba", "La Campiña", "Suba - TV 91", "21 Ángeles", "Gratamira", 
        "Suba - Av. Boyacá", "Niza - Calle 127", "Humedal Córdoba", "Shaio", 
        "Suba - Calle 116", "Suba - Calle 100", "Suba - Calle 95", "Puentelargo", 
        "San Martín", "Castellana", "NQS - Calle 75", "Avenida El Dorado", 
        "CAD", "Ricaurte (NQS)", "Comuneros", "Santa Isabel"
      ]
    },
    {
      "ruta": "C15",
      "tipo": "Expreso",
      "origen": "Portal Sur",
      "destino": "Portal Suba",
      "paradas": [
        "Portal Sur", "Perdomo", "Madelena", "Sevillana", "Venecia", "Alquería", 
        "General Santander", "Calle 40 Sur", "Quiroga", "Olaya", "Restrepo", 
        "Hortúa", "Hospital", "Tercer Milenio", "Calle 19", "Calle 22", 
        "Calle 34", "Avenida 39", "Calle 45", "Marly", "Calle 57", 
        "Calle 76 - San Felipe", "San Martín", "Suba - Calle 95", "Suba - Calle 100", 
        "Shaio", "Niza - Calle 127", "Suba - Av. Boyacá", "21 Ángeles", 
        "Suba - TV 91", "La Campiña", "Portal Suba"
      ]
    },
    {
      "ruta": "C17",
      "tipo": "Expreso",
      "origen": "Portal Usme",
      "destino": "Portal Suba",
      "paradas": [
        "Portal Usme", "Molinos", "Consuelo", "Olaya", "Restrepo", "Hospital", 
        "Calle 19", "Calle 34", "Calle 45", "Marly", "Calle 57", 
        "Calle 76 - San Felipe", "San Martín", "Suba - Calle 100", "Shaio", 
        "Humedal Córdoba", "Niza - Calle 127", "Suba - Av. Boyacá", "21 Ángeles", 
        "La Campiña", "Portal Suba"
      ]
    },
    {
      "ruta": "C19",
      "tipo": "Expreso",
      "origen": "Portal Banderas",
      "destino": "Portal Suba",
      "paradas": [
        "Banderas", "Mundo Aventura", "Marsella", "Pradera", "Distrito Grafiti", 
        "Puente Aranda", "Ricaurte (NQS)", "Paloquemao", "CAD", "Avenida El Dorado", 
        "Universidad Nacional", "NQS - Calle 75", "Suba - Calle 95", "Suba - Calle 100", 
        "Shaio", "Humedal Córdoba", "Niza - Calle 127", "Suba - Av. Boyacá", 
        "21 Ángeles", "Suba - TV 91", "La Campiña", "Portal Suba"
      ]
    },
    {
      "ruta": "C25",
      "tipo": "Expreso",
      "origen": "Portal 20 de Julio",
      "destino": "Portal Suba",
      "paradas": [
        "Portal 20 de Julio", "Av. 1° de Mayo", "San Victorino", "Las Nieves", 
        "San Diego", "Calle 34", "Calle 45", "Marly", "Calle 57", 
        "Calle 76 - San Felipe", "San Martín", "Suba - Calle 100", "Shaio", 
        "Niza - Calle 127", "Suba - Av. Boyacá", "21 Ángeles", "Portal Suba"
      ]
    },
    {
      "ruta": "C30",
      "tipo": "Expreso",
      "origen": "Portal Sur",
      "destino": "Portal Suba",
      "paradas": [
        "Portal Sur", "Perdomo", "Madelena", "Sevillana", "Venecia", "General Santander", 
        "NQS - Calle 30 Sur", "Ricaurte (NQS)", "CAD", "Avenida El Dorado", 
        "Universidad Nacional", "NQS - Calle 75", "Suba - Calle 95", "Suba - Calle 100", 
        "Shaio", "Humedal Córdoba", "Niza - Calle 127", "Suba - Av. Boyacá", 
        "21 Ángeles", "Portal Suba"
      ]
    },
    {
      "ruta": "C84",
      "tipo": "Dual",
      "origen": "Museo Nacional",
      "destino": "Portal Suba",
      "paradas": [
        "Museo Nacional", "San Diego", "Calle 34", "Avenida 39", "Calle 45", "Marly", 
        "Calle 57", "Calle 76 - San Felipe", "Calle 85", "Virrey", "Calle 100", 
        "Calle 106", "Pepe Sierra", "Calle 127", "Prado", "Alcalá", "Calle 142", 
        "Calle 146", "Mazurén", "Calle 161", "Portal Norte", "Suba - TV 91", "Portal Suba"
      ]
    },
    // Rutas B
    {
      "ruta": "8",
      "tipo": "Ruta Fácil",
      "origen": "Terminal Norte",
      "destino": "Guatoque - Veraguas",
      "paradas": [
        "Terminal", "Calle 187", "Portal Norte", "Toberín", "Calle 161", "Mazurén", 
        "Calle 146", "Calle 142", "Prado", "Alcalá", "Calle 127", "Pepe Sierra", 
        "Calle 106", "Calle 100", "Virrey", "Calle 85", "Héroes", "Calle 76 - San Felipe", 
        "Calle 57", "Marly", "Calle 45", "Avenida 39", "Calle 34", "Calle 22", 
        "Calle 19", "Tercer Milenio", "Hospital", "Guatoque - Veraguas"
      ]
    },
    {
      "ruta": "B10",
      "tipo": "Expreso",
      "origen": "Portal Eldorado",
      "destino": "Portal Norte",
      "paradas": [
        "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", "CAN", 
        "Gobernación", "Corferias", "Ciudad Universitaria", "Concejo de Bogotá", 
        "Calle 45", "Marly", "Calle 57", "Calle 76 - San Felipe", "Calle 85", 
        "Virrey", "Calle 100", "Calle 106", "Pepe Sierra", "Calle 127", "Prado", 
        "Calle 146", "Mazurén", "Calle 161", "Toberín", "Portal Norte"
      ]
    },
    {
      "ruta": "B11",
      "tipo": "Expreso",
      "origen": "Portal Sur",
      "destino": "Terminal Norte",
      "paradas": [
        "Portal Sur", "Perdomo", "Madelena", "Sevillana", "Venecia", "Alquería", 
        "General Santander", "NQS - Calle 30 Sur", "Guatoque - Veraguas", 
        "Ricaurte (NQS)", "CAD", "Avenida El Dorado", "NQS - Calle 75", "Castellana", 
        "Virrey", "Calle 100", "Calle 127", "Prado", "Mazurén", "Calle 146", 
        "Portal Norte", "Calle 187", "Terminal"
      ]
    },
    {
      "ruta": "B12",
      "tipo": "Expreso",
      "origen": "Portal Sur",
      "destino": "Portal Norte",
      "paradas": [
        "Portal Sur", "Madelena", "Sevillana", "Alquería", "General Santander", 
        "SENA", "Comuneros", "Ricaurte (NQS)", "CAD", "Universidad Nacional", 
        "Avenida El Dorado", "NQS - Calle 75", "Virrey", "Calle 85", "Calle 100", 
        "Calle 106", "Alcalá", "Calle 142", "Calle 161", "Portal Norte"
      ]
    },
    {
      "ruta": "B13",
      "tipo": "Expreso",
      "origen": "Portal Tunal",
      "destino": "Portal Norte",
      "paradas": [
        "Portal Tunal", "Biblioteca", "Parque", "Olaya", "Restrepo", "Hospital", 
        "Calle 19", "Calle 22", "Calle 34", "Calle 45", "Marly", "Calle 57", 
        "Calle 76 - San Felipe", "Calle 85", "Virrey", "Calle 100", "Calle 106", 
        "Pepe Sierra", "Calle 127", "Prado", "Calle 142", "Calle 146", "Mazurén", 
        "Calle 161", "Toberín", "Portal Norte"
      ]
    },
    {
      "ruta": "B16",
      "tipo": "Expreso",
      "origen": "Portal Eldorado",
      "destino": "Terminal Norte",
      "paradas": [
        "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", "CAN", 
        "Gobernación", "Corferias", "Ciudad Universitaria", "Concejo de Bogotá", 
        "Av. 39", "Calle 45", "Marly", "Calle 57", "Calle 76 - San Felipe", 
        "Héroes", "Calle 85", "Virrey", "Calle 100", "Calle 106", "Pepe Sierra", 
        "Calle 127", "Prado", "Calle 142", "Calle 146", "Mazurén", "Calle 161", 
        "Toberín", "Portal Norte", "Calle 187", "Terminal"
      ]
    },
    {
      "ruta": "B18",
      "tipo": "Expreso",
      "origen": "Portal 20 de Julio",
      "destino": "Terminal Norte",
      "paradas": [
        "Portal 20 de Julio", "Av. 1° de Mayo", "San Victorino", "Las Nieves", 
        "San Diego", "Calle 22", "Calle 45", "Marly", "Calle 57", "Calle 76 - San Felipe", 
        "Calle 85", "Virrey", "Calle 100", "Calle 106", "Pepe Sierra", "Calle 127", 
        "Prado", "Calle 142", "Calle 146", "Mazurén", "Calle 161", "Toberín", 
        "Portal Norte", "Calle 187", "Terminal"
      ]
    },
    {
      "ruta": "B23",
      "tipo": "Expreso",
      "origen": "Portal Eldorado",
      "destino": "Alcalá",
      "paradas": [
        "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", "CAN", 
        "Gobernación", "Corferias", "Ciudad Universitaria", "Concejo de Bogotá", 
        "Calle 45", "Marly", "Calle 57", "Calle 76 - San Felipe", "Calle 85", 
        "Calle 100", "Calle 106", "Calle 127", "Prado", "Alcalá"
      ]
    },
    {
      "ruta": "B26",
      "tipo": "Expreso",
      "origen": "Portal Américas",
      "destino": "Alcalá",
      "paradas": [
        "Portal Américas", "Patio Bonito", "Biblioteca Tintal", "Transversal 86", 
        "Banderas", "Mundo Aventura", "Marsella", "Pradera", "Distrito Grafiti", 
        "Puente Aranda", "Ricaurte (Calle 13)", "Calle 19", "Calle 45", "Marly", 
        "Calle 57", "Calle 76 - San Felipe", "Calle 85", "Virrey", "Calle 100", 
        "Calle 106", "Pepe Sierra", "Calle 127", "Prado", "Alcalá"
      ]
    },
    {
      "ruta": "B28",
      "tipo": "Expreso",
      "origen": "Portal Sur",
      "destino": "Portal Norte",
      "paradas": [
        "Portal Sur", "Perdomo", "Madelena", "Sevillana", "Venecia", "General Santander", 
        "NQS - Calle 30 Sur", "Ricaurte (NQS)", "CAD", "Avenida El Dorado", 
        "Universidad Nacional", "NQS - Calle 75", "Calle 85", "Calle 100", 
        "Calle 127", "Prado", "Mazurén", "Toberín", "Portal Norte"
      ]
    },
    {
      "ruta": "B72",
      "tipo": "Expreso",
      "origen": "Portal Usme",
      "destino": "Portal Norte",
      "paradas": [
        "Portal Usme", "Molinos", "Calle 40 Sur", "Olaya", "Restrepo", "Hospital", 
        "Calle 19", "Calle 22", "Calle 34", "Calle 45", "Marly", "Calle 57", 
        "Calle 76 - San Felipe", "Héroes", "Calle 100", "Pepe Sierra", "Calle 127", 
        "Prado", "Alcalá", "Calle 142", "Calle 146", "Mazurén", "Calle 161", 
        "Toberín", "Portal Norte"
      ]
    },
    // Rutas F
    {
      "ruta": "5",
      "tipo": "Ruta Fácil",
      "origen": "Portal Américas",
      "destino": "Calle 22",
      "paradas": [
        "Portal Américas", "Patio Bonito", "Biblioteca Tintal", "Transversal 86", 
        "Banderas", "Mandalay", "Mundo Aventura", "Marsella", "Pradera", 
        "Distrito Grafiti", "Puente Aranda", "Carrera 43", "Zona Industrial", 
        "CDS - Carrera 32", "Ricaurte", "San Façon - Carrera 22", "De La Sabana", "Calle 22"
      ]
    },
    {
      "ruta": "F14",
      "tipo": "Expreso",
      "origen": "Portal Norte",
      "destino": "Portal Américas",
      "paradas": [
        "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 142", "Prado", 
        "Calle 127", "Pepe Sierra", "Calle 106", "Calle 100", "Calle 85", 
        "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Avenida 39", 
        "Calle 19", "Ricaurte", "Distrito Grafiti", "Pradera", "Marsella", 
        "Mundo Aventura", "Banderas", "Transversal 86", "Biblioteca Tintal", 
        "Patio Bonito", "Portal Américas"
      ]
    },
    {
      "ruta": "F23",
      "tipo": "Expreso",
      "origen": "Alcalá",
      "destino": "Portal Américas",
      "paradas": [
        "Alcalá", "Prado", "Calle 127", "Calle 116", "Calle 100", "Calle 85", 
        "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Avenida 39", 
        "Calle 19", "Ricaurte", "Puente Aranda", "Distrito Grafiti", "Pradera", 
        "Marsella", "Mundo Aventura", "Banderas", "Portal Américas"
      ]
    },
    {
      "ruta": "F26",
      "tipo": "Expreso",
      "origen": "Alcalá",
      "destino": "Portal Américas",
      "paradas": [
        "Alcalá", "Prado", "Calle 127", "Pepe Sierra", "Calle 106", "Calle 100", 
        "Virrey", "Calle 85", "Calle 76 - San Felipe", "Calle 57", "Marly", 
        "Calle 45", "Calle 19", "Ricaurte", "Puente Aranda", "Distrito Grafiti", 
        "Pradera", "Marsella", "Mundo Aventura", "Banderas", "Transversal 86", 
        "Biblioteca Tintal", "Patio Bonito", "Portal Américas"
      ]
    },
    {
      "ruta": "F28",
      "tipo": "Expreso",
      "origen": "Portal Norte",
      "destino": "Portal Américas",
      "paradas": [
        "Portal Norte", "Toberín", "Mazurén", "Prado", "Calle 127", "Calle 100", 
        "Calle 85", "NQS - Calle 75", "Universidad Nacional", "Avenida El Dorado", 
        "CAD", "Ricaurte", "CDS - Carrera 32", "Puente Aranda", "Marsella", 
        "Banderas", "Portal Américas"
      ]
    },
    {
      "ruta": "F32",
      "tipo": "Expreso",
      "origen": "Portal Norte",
      "destino": "Portal Américas",
      "paradas": [
        "Portal Norte", "Calle 161", "Calle 142", "Alcalá", "Calle 106", 
        "Calle 100", "Virrey", "Castellana", "NQS - Calle 75", "Avenida El Dorado", 
        "CAD", "Ricaurte", "Zona Industrial", "Pradera", "Mundo Aventura", 
        "Banderas", "Patio Bonito", "Portal Américas"
      ]
    },
    {
      "ruta": "F51",
      "tipo": "Expreso",
      "origen": "Portal Norte",
      "destino": "Portal Américas",
      "paradas": [
        "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 146", "Calle 142", 
        "Prado", "Alcalá", "Calle 127", "Pepe Sierra", "Calle 116", "Calle 106", 
        "Calle 100", "Virrey", "Calle 85", "Héroes", "Calle 76 - San Felipe", 
        "Calle 57", "Marly", "Calle 45", "Avenida 39", "Calle 34", "Calle 22", 
        "Ricaurte", "CDS - Carrera 32", "Zona Industrial", "Carrera 43", 
        "Puente Aranda", "Distrito Grafiti", "Pradera", "Marsella", "Mandalay", 
        "Banderas", "Portal Américas"
      ]
    },
    {
      "ruta": "F60",
      "tipo": "Expreso",
      "origen": "Calle 76 - San Felipe",
      "destino": "Portal Américas",
      "paradas": [
        "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Avenida 39", 
        "Calle 34", "Calle 22", "Calle 19", "Ricaurte", "Zona Industrial", 
        "Puente Aranda", "Distrito Grafiti", "Pradera", "Marsella", "Mundo Aventura", 
        "Mandalay", "Banderas", "Transversal 86", "Biblioteca Tintal", 
        "Patio Bonito", "Portal Américas"
      ]
    },
    // Rutas H
    {
      "ruta": "3",
      "tipo": "Ruta Fácil",
      "origen": "Portal Norte",
      "destino": "Portal Tunal",
      "paradas": [
        "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 146", "Calle 142", "Prado", 
        "Alcalá", "Calle 127", "Pepe Sierra", "Calle 106", "Calle 100", "Virrey", "Calle 85", 
        "Héroes", "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Avenida 39", 
        "Calle 34", "Calle 22", "Calle 19", "Tercer Milenio", "Hospital", "Hortúa", "Restrepo", 
        "Fucha", "Olaya", "Quiroga", "Calle 40 Sur", "Biblioteca", "Parque", "Portal Tunal"
      ]
    },
    {
      "ruta": "H13",
      "tipo": "Expreso",
      "origen": "Portal Norte",
      "destino": "Portal Tunal",
      "paradas": [
        "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 146", "Calle 142", "Prado", 
        "Calle 127", "Pepe Sierra", "Calle 106", "Calle 100", "Virrey", "Calle 85", 
        "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Calle 34", "Calle 22", 
        "Calle 19", "Hospital", "Restrepo", "Olaya", "Parque", "Biblioteca", "Portal Tunal"
      ]
    },
    {
      "ruta": "H15",
      "tipo": "Expreso",
      "origen": "Calle 76 - San Felipe",
      "destino": "Portal Sur",
      "paradas": [
        "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Avenida 39", "Calle 34", 
        "Calle 22", "Calle 19", "Tercer Milenio", "Hospital", "Hortúa", "Restrepo", "Olaya", 
        "Quiroga", "Calle 40 Sur", "General Santander", "Alquería", "Venecia", "Sevillana", 
        "Madelena", "Perdomo", "Portal Sur"
      ]
    },
    {
      "ruta": "H17",
      "tipo": "Expreso",
      "origen": "Portal Suba",
      "destino": "Portal Usme",
      "paradas": [
        "Portal Suba", "La Campiña", "21 Ángeles", "Suba - Av. Boyacá", "Niza - Calle 127", 
        "Humedal Córdoba", "Shaio", "Suba - Calle 100", "San Martín", "Calle 76 - San Felipe", 
        "Calle 57", "Marly", "Calle 45", "Calle 34", "Calle 19", "Hospital", "Restrepo", 
        "Olaya", "Consuelo", "Socorro", "Molinos", "Portal Usme"
      ]
    },
    {
      "ruta": "H20",
      "tipo": "Expreso",
      "origen": "Portal 80",
      "destino": "Portal Usme",
      "paradas": [
        "Portal 80", "Avenida Cali", "Ferias", "Avenida 68", "Carrera 47", "Escuela Militar", 
        "Polo", "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Calle 34", 
        "Calle 22", "Calle 19", "Hospital", "Restrepo", "Olaya", "Calle 40 Sur", "Molinos", 
        "Portal Usme"
      ]
    },
    {
      "ruta": "H21",
      "tipo": "Expreso",
      "origen": "Portal 80",
      "destino": "Portal Tunal",
      "paradas": [
        "Portal 80", "Avenida Cali", "Granja - Carrera 77", "Avenida 68", "Avenida Chile", 
        "Escuela Militar", "Polo", "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", 
        "Calle 34", "Calle 22", "Calle 19", "Restrepo", "Olaya", "Calle 40 Sur", "Biblioteca", 
        "Parque", "Portal Tunal"
      ]
    },
    {
      "ruta": "H27",
      "tipo": "Expreso",
      "origen": "Portal Norte",
      "destino": "Portal Tunal",
      "paradas": [
        "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 146", "Calle 142", "Prado", 
        "Alcalá", "Calle 127", "Pepe Sierra", "Calle 106", "Calle 100", "Virrey", "Calle 85", 
        "Héroes", "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Calle 40 Sur", 
        "Biblioteca", "Parque", "Portal Tunal"
      ]
    },
    {
      "ruta": "H54",
      "tipo": "Expreso",
      "origen": "Portal Eldorado",
      "destino": "Portal Sur",
      "paradas": [
        "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", "CAN", 
        "Gobernación", "Corferias", "Ciudad Universitaria", "Concejo de Bogotá", 
        "Tercer Milenio", "Hospital", "Hortúa", "Restrepo", "Fucha", "Av. 1° de Mayo", 
        "Olaya", "Quiroga", "Calle 40 Sur", "General Santander", "Alquería", "Venecia", 
        "Sevillana", "Madelena", "Perdomo", "Portal Sur"
      ]
    },
    {
      "ruta": "H72",
      "tipo": "Expreso",
      "origen": "Portal Norte",
      "destino": "Portal Usme",
      "paradas": [
        "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 146", "Calle 142", 
        "Alcalá", "Prado", "Calle 127", "Pepe Sierra", "Calle 100", "Héroes", 
        "Calle 76 - San Felipe", "Calle 57", "Marly", "Calle 45", "Calle 34", "Calle 22", 
        "Calle 19", "Hospital", "Restrepo", "Olaya", "Calle 40 Sur", "Molinos", "Portal Usme"
      ]
    },
    {
      "ruta": "H75",
      "tipo": "Expreso",
      "origen": "Portal Norte",
      "destino": "Portal Usme",
      "paradas": [
        "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 146", "Calle 142", "Prado", 
        "Calle 127", "Calle 100", "Virrey", "NQS - Calle 75", "Universidad Nacional", 
        "Avenida El Dorado", "CAD", "Ricaurte (NQS)", "SENA", "General Santander", 
        "Calle 40 Sur", "Molinos", "Portal Usme"
      ]
    },
    // Rutas L
    {
      "ruta": "2",
      "tipo": "Ruta Fácil (L)",
      "origen": "Portal 20 de Julio",
      "destino": "Museo Nacional",
      "paradas": [
        "Portal 20 de Julio", "Country Sur", "Av. 1° de Mayo", "Ciudad Jardin", 
        "Policía Central", "Fucha", "Restrepo", "Hortúa", "Hospital", 
        "San Victorino", "Las Nieves", "San Diego", "Museo Nacional"
      ]
    },
    {
      "ruta": "L10",
      "tipo": "Expreso",
      "origen": "Portal Eldorado",
      "destino": "Portal 20 de Julio",
      "paradas": [
        "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", "CAN", 
        "Gobernación", "Corferias", "Ciudad Universitaria", "Concejo de Bogotá", 
        "San Diego", "Las Nieves", "San Victorino", "Hospital", "Hortúa", 
        "Restrepo", "Fucha", "Av. 1° de Mayo", "Country Sur", "Portal 20 de Julio"
      ]
    },
    {
      "ruta": "L18",
      "tipo": "Expreso",
      "origen": "Terminal Norte",
      "destino": "Portal 20 de Julio",
      "paradas": [
        "Terminal", "Calle 187", "Portal Norte", "Toberín", "Calle 161", "Mazurén", 
        "Calle 142", "Prado", "Calle 127", "Calle 100", "Calle 85", "Calle 76 - San Felipe", 
        "Calle 57", "Marly", "Calle 45", "Calle 22", "San Diego", "Las Nieves", 
        "San Victorino", "Av. 1° de Mayo", "Portal 20 de Julio"
      ]
    },
    {
      "ruta": "L25",
      "tipo": "Expreso",
      "origen": "Portal Suba",
      "destino": "Portal 20 de Julio",
      "paradas": [
        "Portal Suba", "21 Ángeles", "Suba - Av. Boyacá", "Niza - Calle 127", "Shaio", 
        "Suba - Calle 100", "San Martín", "Calle 76 - San Felipe", "Calle 57", 
        "Marly", "Calle 45", "Calle 34", "San Diego", "Las Nieves", "San Victorino", 
        "Av. 1° de Mayo", "Portal 20 de Julio"
      ]
    },
    {
      "ruta": "L81",
      "tipo": "Dual",
      "origen": "Portal 80",
      "destino": "Portal 20 de Julio",
      "paradas": [
        "Portal 80", "Avenida Cali", "Granja - Carrera 77", "Avenida 68", "Avenida Chile", 
        "Escuela Militar", "Polo", "Calle 76 - San Felipe", "Calle 57", "Marly", 
        "Calle 45", "San Diego", "Las Nieves", "San Victorino", "Av. 1° de Mayo", 
        "Portal 20 de Julio"
      ]
    },
    {
      "ruta": "L82",
      "tipo": "Dual",
      "origen": "Calle 134 (Carrera 7)",
      "destino": "Portal 20 de Julio",
      "paradas": [
        "Cl 134", "Cl 127", "Cl 116", "Cl 106", "Cl 94", "Cl 82", "Cl 72", "Cl 67", 
        "Cl 53", "Cl 45", "Museo Nacional", "San Diego", "Las Nieves", "San Victorino", 
        "Av. 1° de Mayo", "Portal 20 de Julio"
      ]
    },
    // Rutas J
    {
      "ruta": "J23",
      "tipo": "Expreso (Eje Ambiental)",
      "origen": "Portal Eldorado",
      "destino": "Las Aguas",
      "paradas": [
        "Portal Eldorado", "Modelia", "Avenida Rojas", "El Tiempo - Maloka", "CAN", 
        "Gobernación", "Corferias", "Ciudad Universitaria", "Concejo de Bogotá", 
        "Calle 19", "Avenida Jimenez", "Museo del Oro", "Las Aguas"
      ]
    },
    {
      "ruta": "J24",
      "tipo": "Expreso (Eje Ambiental)",
      "origen": "Portal 80",
      "destino": "Universidades",
      "paradas": [
        "Portal 80", "Avenida Cali", "Granja - Carrera 77", "Avenida 68", "Ferias", 
        "Avenida Chile", "Escuela Militar", "Polo", "Calle 76 - San Felipe", 
        "Calle 85", "Virrey", "Calle 100", "Calle 127", "Prado", "Alcalá", 
        "Universidades"
      ]
    },
    {
      "ruta": "J74",
      "tipo": "Expreso (Eje Ambiental)",
      "origen": "Portal Norte",
      "destino": "Universidades",
      "paradas": [
        "Portal Norte", "Toberín", "Calle 161", "Mazurén", "Calle 146", "Calle 142", 
        "Prado", "Calle 127", "Pepe Sierra", "Calle 100", "Calle 85", "Calle 76 - San Felipe", 
        "Calle 57", "Marly", "Calle 45", "Universidades"
      ]
    },
    // Rutas E (NQS)
    {
      "ruta": "E32",
      "tipo": "Expreso",
      "origen": "Portal Américas",
      "destino": "NQS - Calle 75",
      "paradas": [
        "Portal Américas",
        "Patio Bonito",
        "Banderas",
        "Mundo Aventura",
        "Pradera",
        "Zona Industrial",
        "Ricaurte (NQS)",
        "CAD",
        "Avenida El Dorado",
        "NQS - Calle 75"
      ]
    },
    {
      "ruta": "E42",
      "tipo": "Expreso",
      "origen": "San Mateo",
      "destino": "Portal Suba",
      "paradas": [
        "San Mateo",
        "Terreros",
        "Venecia",
        "General Santander",
        "SENA",
        "Ricaurte (NQS)",
        "NQS - Calle 75",
        "Suba - Calle 100",
        "Niza - Calle 127",
        "Suba - Av. Boyacá",
        "21 Ángeles",
        "Portal Suba"
      ]
    }
  ];


