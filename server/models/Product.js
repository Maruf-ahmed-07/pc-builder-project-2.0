const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product name is required'],
    trim: true,
    maxlength: [100, 'Product name cannot exceed 100 characters']
  },
  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },
  price: {
    type: Number,
    required: [true, 'Product price is required'],
    min: [0, 'Price cannot be negative']
  },
  originalPrice: {
    type: Number,
    min: [0, 'Original price cannot be negative']
  },
  category: {
    type: String,
    required: [true, 'Product category is required'],
    enum: [
      'CPU',
      'GPU',
      'Motherboard',
      'RAM',
      'Storage',
      'Power Supply',
      'Case',
      'Cooling',
      'Monitor',
      'Keyboard',
      'Mouse',
      'Headset',
      'Speakers',
      'Webcam',
      'Accessories'
    ]
  },
  brand: {
    type: String,
    required: [true, 'Brand is required'],
    trim: true
  },
  model: {
    type: String,
    required: [true, 'Model is required'],
    trim: true
  },
  images: [{
    url: {
      type: String,
      required: true
    },
    alt: {
      type: String,
      default: ''
    }
  }],
  specifications: {
    type: Map,
    of: String
  },
  detailedSpecs: {
    cpu: {
      cores: { type: String },
      threads: { type: String },
      baseClock: { type: String },
      boostClock: { type: String },
      socket: { type: String },
      tdp: { type: String },
      l1Cache: { type: String },
      l2Cache: { type: String },
      l3Cache: { type: String },
      manufacturingProcess: { type: String },
      architecture: { type: String },
      integratedGraphics: { type: String },
      memorySupport: { type: String },
      pcieSupport: { type: String },
      coolerIncluded: { type: String },
      maxTemperature: { type: String }
    },
    gpu: {
      gpuChip: { type: String },
      architecture: { type: String },
      manufacturingProcess: { type: String },
      cudaCores: { type: String },
      rtCores: { type: String },
      tensorCores: { type: String },
      baseClock: { type: String },
      boostClock: { type: String },
      memorySize: { type: String },
      memoryType: { type: String },
      memorySpeed: { type: String },
      memoryInterface: { type: String },
      memoryBandwidth: { type: String },
      tdp: { type: String },
      recommendedPSU: { type: String },
      displayOutputs: { type: String },
      maxResolution: { type: String },
      directxSupport: { type: String },
      rayTracing: { type: String },
      dlssVersion: { type: String },
      length: { type: String },
      width: { type: String },
      height: { type: String }
    },
    motherboard: {
      socket: { type: String },
      chipset: { type: String },
      formFactor: { type: String },
      memorySlots: { type: String },
      maxMemory: { type: String },
      memorySpeed: { type: String },
      pcieX16Slots: { type: String },
      pcieX8Slots: { type: String },
      pcieX1Slots: { type: String },
      m2Slots: { type: String },
      sataPorts: { type: String },
      usbPorts: { type: String },
      ethernet: { type: String },
      wifi: { type: String },
      bluetooth: { type: String },
      audio: { type: String },
      rgbLighting: { type: String },
      biosType: { type: String },
      cpuPower: { type: String },
      fanHeaders: { type: String },
      overclockingSupport: { type: String },
      multiGpuSupport: { type: String }
    },
    ram: {
      totalCapacity: { type: String },
      moduleConfiguration: { type: String },
      memoryType: { type: String },
      speed: { type: String },
      casLatency: { type: String },
      primaryTimings: { type: String },
      voltage: { type: String },
      heatSpreader: { type: String },
      height: { type: String },
      profileSupport: { type: String },
      intelXmp: { type: String },
      errorCorrection: { type: String },
      bufferedRegistered: { type: String },
      multiChannelKit: { type: String },
      color: { type: String },
      ledLighting: { type: String },
      warranty: { type: String },
      testedSpeed: { type: String },
      operatingTemperature: { type: String },
      platformCompatibility: { type: String }
    },
    storage: {
      capacity: { type: String },
      formFactor: { type: String },
      interface: { type: String },
      nandType: { type: String },
      controller: { type: String },
      cache: { type: String },
      sequentialRead: { type: String },
      sequentialWrite: { type: String },
      randomReadIops: { type: String },
      randomWriteIops: { type: String },
      tbwEndurance: { type: String },
      mtbf: { type: String },
      operatingTemperature: { type: String },
      powerConsumption: { type: String },
      warranty: { type: String },
      encryption: { type: String },
      trimSupport: { type: String },
      smartSupport: { type: String },
      overProvisioning: { type: String },
      heatSpreader: { type: String },
      deviceSleepMode: { type: String }
    },
    // Power Supply specific specs
    powerSupply: {
      wattage: { type: String },
      efficiency: { type: String },
      modular: { type: String },
      formFactor: { type: String },
      fanSize: { type: String },
      railsConfig: { type: String },
      pciePins: { type: String },
      sataPins: { type: String },
      molexPins: { type: String },
      cpuPins: { type: String },
      protections: { type: String },
      warranty: { type: String },
      dimensions: { type: String },
      weight: { type: String }
    },
    // Case specific specs
    case: {
      formFactor: { type: String },
      motherboardSupport: { type: String },
      maxGpuLength: { type: String },
      maxCpuCoolerHeight: { type: String },
      expansionSlots: { type: String },
      driveBays: { type: String },
      frontPorts: { type: String },
      fanSupport: { type: String },
      radiatorSupport: { type: String },
      windowPanel: { type: String },
      material: { type: String },
      dimensions: { type: String },
      weight: { type: String }
    },
    // Cooling specific specs
    cooling: {
      coolerType: { type: String },
      socketSupport: { type: String },
      fanSize: { type: String },
      fanSpeed: { type: String },
      airflow: { type: String },
      noiseLevel: { type: String },
      heatpipeCount: { type: String },
      radiatorSize: { type: String },
      pumpSpeed: { type: String },
      tubeLength: { type: String },
      tdpRating: { type: String },
      rgbLighting: { type: String },
      dimensions: { type: String },
      weight: { type: String }
    },
    // Monitor specific specs
    monitor: {
      screenSize: { type: String },
      resolution: { type: String },
      panelType: { type: String },
      refreshRate: { type: String },
      responseTime: { type: String },
      brightness: { type: String },
      contrast: { type: String },
      colorGamut: { type: String },
      hdr: { type: String },
      curvature: { type: String },
      aspectRatio: { type: String },
      inputs: { type: String },
      usbHub: { type: String },
      adjustability: { type: String },
      vesaMount: { type: String },
      builtInSpeakers: { type: String },
      powerConsumption: { type: String },
      warranty: { type: String }
    },
    // Keyboard specific specs
    keyboard: {
      keyboardType: { type: String },
      switchType: { type: String },
      layout: { type: String },
      connectivity: { type: String },
      backlighting: { type: String },
      macroKeys: { type: String },
      mediaKeys: { type: String },
      wristRest: { type: String },
      cableLength: { type: String },
      software: { type: String },
      nKeyRollover: { type: String },
      batteryLife: { type: String },
      dimensions: { type: String },
      weight: { type: String }
    },
    // Mouse specific specs
    mouse: {
      mouseType: { type: String },
      sensor: { type: String },
      dpi: { type: String },
      pollingRate: { type: String },
      buttons: { type: String },
      connectivity: { type: String },
      batteryLife: { type: String },
      weight: { type: String },
      lighting: { type: String },
      software: { type: String },
      cableLength: { type: String },
      footType: { type: String },
      warranty: { type: String }
    },
    // Headset specific specs
    headset: {
      headsetType: { type: String },
      driverSize: { type: String },
      frequency: { type: String },
      impedance: { type: String },
      sensitivity: { type: String },
      microphoneType: { type: String },
      connectivity: { type: String },
      cableLength: { type: String },
      weight: { type: String },
      batteryLife: { type: String },
      noiseCancellation: { type: String },
      software: { type: String },
      warranty: { type: String }
    },
    // Speakers specific specs
    speakers: {
      speakerType: { type: String },
      totalPower: { type: String },
      frequency: { type: String },
      drivers: { type: String },
      connectivity: { type: String },
      controls: { type: String },
      lighting: { type: String },
      dimensions: { type: String },
      weight: { type: String },
      warranty: { type: String }
    },
    // Webcam specific specs
    webcam: {
      maxResolution: { type: String },
      frameRate: { type: String },
      sensorType: { type: String },
      fieldOfView: { type: String },
      focusType: { type: String },
      microphone: { type: String },
      connectivity: { type: String },
      mountType: { type: String },
      software: { type: String },
      warranty: { type: String }
    }
  },
  compatibility: {
    socket: String,
    formFactor: String,
    memoryType: String,
    powerRequirement: Number,
    dimensions: {
      length: Number,
      width: Number,
      height: Number
    }
  },
  stock: {
    type: Number,
    required: [true, 'Stock quantity is required'],
    min: [0, 'Stock cannot be negative'],
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  featured: {
    type: Boolean,
    default: false
  },
  ratings: {
    average: {
      type: Number,
      default: 0,
      min: 0,
      max: 5
    },
    count: {
      type: Number,
      default: 0
    }
  },
  reviews: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5
    },
    comment: {
      type: String,
      maxlength: [500, 'Review comment cannot exceed 500 characters']
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  tags: [String],
  weight: Number,
  warranty: {
    duration: Number,
    type: String
  }
}, {
  timestamps: true
});

// Index for better search performance
productSchema.index({ name: 'text', description: 'text', brand: 'text' });
productSchema.index({ category: 1, brand: 1 });
productSchema.index({ price: 1 });
productSchema.index({ 'ratings.average': -1 });

// Calculate average rating when reviews are updated
productSchema.methods.calculateAverageRating = function() {
  if (this.reviews.length === 0) {
    this.ratings.average = 0;
    this.ratings.count = 0;
  } else {
    const totalRating = this.reviews.reduce((sum, review) => sum + review.rating, 0);
    this.ratings.average = totalRating / this.reviews.length;
    this.ratings.count = this.reviews.length;
  }
  return this.save();
};

// Get category-specific specifications
productSchema.methods.getCategorySpecs = function() {
  if (!this.detailedSpecs) return {};
  
  const categoryMap = {
    'CPU': 'cpu',
    'GPU': 'gpu', 
    'Motherboard': 'motherboard',
    'RAM': 'ram',
    'Storage': 'storage',
    'Power Supply': 'powerSupply',
    'Case': 'case',
    'Cooling': 'cooling',
    'Monitor': 'monitor',
    'Keyboard': 'keyboard',
    'Mouse': 'mouse',
    'Headset': 'headset',
    'Speakers': 'speakers',
    'Webcam': 'webcam'
  };
  
  const categoryKey = categoryMap[this.category];
  return categoryKey ? (this.detailedSpecs[categoryKey] || {}) : {};
};

// Set category-specific specifications
productSchema.methods.setCategorySpecs = function(specs) {
  if (!this.detailedSpecs) {
    this.detailedSpecs = {};
  }
  
  const categoryMap = {
    'CPU': 'cpu',
    'GPU': 'gpu',
    'Motherboard': 'motherboard', 
    'RAM': 'ram',
    'Storage': 'storage',
    'Power Supply': 'powerSupply',
    'Case': 'case',
    'Cooling': 'cooling',
    'Monitor': 'monitor',
    'Keyboard': 'keyboard',
    'Mouse': 'mouse',
    'Headset': 'headset',
    'Speakers': 'speakers',
    'Webcam': 'webcam'
  };
  
  const categoryKey = categoryMap[this.category];
  if (categoryKey) {
    this.detailedSpecs[categoryKey] = specs;
  }
};

// Get comparable specifications for a category
productSchema.statics.getComparableSpecs = function(category) {
  const specFields = {
    'CPU': [
      'cores', 'threads', 'baseClock', 'boostClock', 'socket', 'tdp', 
      'l3Cache', 'manufacturingProcess', 'architecture', 'memorySupport'
    ],
    'GPU': [
      'cudaCores', 'memorySize', 'memoryType', 'baseClock', 'boostClock', 
      'tdp', 'rayTracing', 'dlssVersion', 'memoryBandwidth', 'architecture'
    ],
    'Motherboard': [
      'socket', 'chipset', 'formFactor', 'memorySlots', 'maxMemory', 
      'pcieX16Slots', 'm2Slots', 'wifi', 'ethernet', 'overclockingSupport'
    ],
    'RAM': [
      'totalCapacity', 'speed', 'casLatency', 'voltage', 'memoryType',
      'profileSupport', 'heatSpreader', 'ledLighting', 'warranty'
    ],
    'Storage': [
      'capacity', 'interface', 'formFactor', 'sequentialRead', 'sequentialWrite',
      'randomReadIops', 'tbwEndurance', 'warranty', 'nandType'
    ],
    'Power Supply': [
      'wattage', 'efficiency', 'modular', 'formFactor', 'warranty',
      'railsConfig', 'protections'
    ],
    'Case': [
      'formFactor', 'motherboardSupport', 'maxGpuLength', 'maxCpuCoolerHeight',
      'expansionSlots', 'fanSupport', 'radiatorSupport', 'windowPanel'
    ],
    'Cooling': [
      'coolerType', 'socketSupport', 'fanSize', 'tdpRating', 'noiseLevel',
      'airflow', 'rgbLighting', 'radiatorSize'
    ],
    'Monitor': [
      'screenSize', 'resolution', 'panelType', 'refreshRate', 'responseTime',
      'brightness', 'hdr', 'curvature', 'aspectRatio', 'inputs'
    ],
    'Keyboard': [
      'keyboardType', 'switchType', 'layout', 'connectivity', 'backlighting',
      'macroKeys', 'nKeyRollover', 'software'
    ],
    'Mouse': [
      'mouseType', 'sensor', 'dpi', 'pollingRate', 'buttons', 'connectivity',
      'weight', 'lighting', 'software'
    ],
    'Headset': [
      'headsetType', 'driverSize', 'frequency', 'impedance', 'microphoneType',
      'connectivity', 'noiseCancellation', 'batteryLife'
    ],
    'Speakers': [
      'speakerType', 'totalPower', 'frequency', 'drivers', 'connectivity',
      'controls', 'lighting'
    ],
    'Webcam': [
      'maxResolution', 'frameRate', 'sensorType', 'fieldOfView', 'focusType',
      'microphone', 'connectivity', 'software'
    ]
  };
  
  return specFields[category] || [];
};

module.exports = mongoose.model('Product', productSchema);
