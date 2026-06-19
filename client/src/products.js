const API = import.meta.env.VITE_API_URL || ''

export const PRODUCTS = [
  {
    id: 'classic-tee',
    name: 'Classic Tee',
    brand: 'AS Colour',
    type: 'T-Shirt',
    price: 20.85,
    logo: 'SAP printed logo on left chest',
    description: 'Heavy weight 220 GSM, 100% combed cotton. Regular fit with neck ribbing, side seams and double needle hems. Pre-shrunk to minimise shrinkage.',
    color: 'Black',
    imageBranded: `${API}/images/tee-branded.png`,
    imageMens:    `${API}/images/tee-mens.jpg`,
    imageWomens:  `${API}/images/tee-womens.jpg`,
    sizesMens:   ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    sizesWomens: ['XS', 'S', 'M', 'L', 'XL'],
  },
  {
    id: 'neptune-polo',
    name: 'Neptune Polo',
    brand: 'James Harvest',
    type: 'Polo Shirt',
    price: 29.35,
    logo: 'SAP embroidered logo on left chest',
    description: '100% combed compact cotton, 200 g/m². Enzyme washed for a softer and smoother finish. Side slits with matching buttons.',
    color: 'Black',
    imageBranded: `${API}/images/polo-branded.png`,
    imageMens:    `${API}/images/polo-mens.jpg`,
    imageWomens:  `${API}/images/polo-womens.jpg`,
    sizesMens:   ['S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL'],
    sizesWomens: ['XS', 'S', 'M', 'L', 'XL'],
  },
]
