// User-provided laboratory photographs; originals are preserved in assets/lab.
export const LAB_PHOTOS = [
  {
    image_url: '/assets/lab/measurement-workstation.jpg',
    title: 'Measurements and data acquisition in the laboratory',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/lab-overview.jpg',
    title: 'Experimental facilities at LATFS',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/flow-sensors.jpg',
    title: 'Flow measurement instruments on an experimental bench',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/lab-infrastructure.jpg',
    title: 'Laboratory infrastructure and experimental stations',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/pressure-gauge.jpg',
    title: 'Pressure measurement on a laboratory fluid loop',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/thermal-test-bench.jpg',
    title: 'Thermal and fluid experiments on a laboratory test bench',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/power-supplies.jpg',
    title: 'Programmable power supplies for experimental testing',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/overhead-services.jpg',
    title: 'Overhead services supporting the laboratory facilities',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/cooling-rack.jpg',
    title: 'Liquid-cooling connections in an experimental rack',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/experiment-stations.jpg',
    title: 'Laboratory stations for thermal and fluid experiments',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/illuminated-experiment.jpg',
    title: 'Illuminated experimental test section',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/research-collaboration.jpg',
    title: 'Researchers reviewing results at a laboratory workstation',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/cooling-manifold.jpg',
    title: 'Cooling manifolds and instrumentation in an experimental rack',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/lab-wide-view.png',
    title: 'Laboratory experimental facilities',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/rack-aisle.png',
    title: 'Liquid cooling research racks',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/two-phase-benches.png',
    title: 'Two-phase cooling experimental benches',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/pumped-loop.png',
    title: 'Pumped fluid loop and instrumentation',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/cold-plate-workbench.png',
    title: 'Cold plates and experimental components',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/daylight-laboratory.png',
    title: 'Thermal and fluid research laboratory',
    category: 'Inside LATFS',
  },
  {
    image_url: '/assets/lab/arpa-e-visit-september-2024.jpg',
    title: 'ARPA-E visit, September 2024',
    category: 'Lab community',
  },
];

export const HERO_PHOTOS = [LAB_PHOTOS[1], LAB_PHOTOS[11], LAB_PHOTOS[5]];

export const RESEARCH_PHOTOS = [
  LAB_PHOTOS[8],
  LAB_PHOTOS[5],
  LAB_PHOTOS[2],
  LAB_PHOTOS[10],
  LAB_PHOTOS[6],
  LAB_PHOTOS[0],
];

export const PARTNER_PHOTO = LAB_PHOTOS[7];

export function researchPhoto(topic, index = 0) {
  const legacy =
    /(?:^|\/)assets\/(?:research-(?:droplet|minichannel|geothermal)|hero-\d+|facility-\d+)\.png$/;
  return topic.image_url && !legacy.test(topic.image_url)
    ? topic.image_url
    : RESEARCH_PHOTOS[index % RESEARCH_PHOTOS.length].image_url;
}
