// Benchmark scoring utility
// Produces a 0-1000 score with breakdown for each component category

function parseNumber(val) {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') return val;
  const m = ('' + val).match(/([0-9]+(?:\.[0-9]+)?)/);
  return m ? parseFloat(m[1]) : null;
}

function parseClockGHz(val) {
  if (!val) return null;
  const s = ('' + val).toLowerCase();
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*(ghz|mhz)?/);
  if (!m) return null;
  const num = parseFloat(m[1]);
  if (m[2] === 'mhz') return +(num / 1000).toFixed(3);
  return num; // assume GHz
}

function parseMemoryGB(val) {
  if (!val) return null;
  const s = ('' + val).toLowerCase();
  let m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*tb/);
  if (m) return parseFloat(m[1]) * 1024;
  m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*gb/);
  if (m) return parseFloat(m[1]);
  m = s.match(/([0-9]+(?:\.[0-9]+)?)\s*mb/);
  if (m) return +(parseFloat(m[1]) / 1024).toFixed(3);
  return parseNumber(s);
}

function invRange(value, min, max) { // higher is better when smaller nm
  if (value == null) return null;
  if (value < min) value = min;
  if (value > max) value = max;
  return (max - value) / (max - min);
}

function clamp01(v) { return v == null ? null : Math.min(1, Math.max(0, v)); }

function normDivide(val, denom) { return val == null ? null : clamp01(val / denom); }

function averagePresent(weightsObj, valuesObj) {
  // Sum of provided weights; used to re-normalize when missing metrics
  let sum = 0;
  for (const [k, w] of Object.entries(weightsObj)) {
    if (valuesObj[k] != null) sum += w;
  }
  return sum || 1;
}

function scoreCPU(cpu) {
  if (!cpu) return { score: 0, details: {}, weightUsed: 0 };
  const cores = parseNumber(cpu.cores);
  const threads = parseNumber(cpu.threads);
  const base = parseNumber(cpu.baseClock_GHz) || parseClockGHz(cpu.baseClock || cpu.baseFrequency);
  const boost = parseNumber(cpu.boostClock_GHz) || parseClockGHz(cpu.boostClock || cpu.boostFrequency);
  const l3 = parseNumber(cpu.l3Cache_MB) || parseMemoryGB(cpu.l3Cache || cpu.cache);
  const nm = parseNumber(cpu.manufacturing_nm) || parseNumber(cpu.manufacturingProcess || cpu.manufacturing);
  const tdp = parseNumber(cpu.tdp_W) || parseNumber(cpu.tdp);
  const manufacturingScore = nm ? invRange(nm, 3, 20) : null;
  const tdpScore = tdp ? clamp01(125 / tdp) : null; // <=125W ideal
  const metrics = {
    mCores: normDivide(cores, 16),
    mThreads: normDivide(threads, 32),
    mBase: normDivide(base, 5.5),
    mBoost: normDivide(boost, 6.0),
    mCache: normDivide(l3, 128),
    mProcess: manufacturingScore == null ? null : clamp01(manufacturingScore),
    mTdpEff: tdpScore
  };
  const weights = { mCores: 0.25, mThreads: 0.15, mBase: 0.2, mBoost: 0.1, mCache: 0.15, mProcess: 0.1, mTdpEff: 0.05 };
  const avail = averagePresent(weights, metrics);
  let composite = 0;
  for (const k of Object.keys(weights)) {
    if (metrics[k] != null) composite += metrics[k] * weights[k];
  }
  composite = composite / avail; // normalize missing
  return { score: composite, details: { cores, threads, base, boost, l3CacheMB: l3, nm, tdp }, weightUsed: 0.35 };
}

function scoreGPU(gpu, isDetected) {
  if (!gpu) return { score: 0, details: {}, weightUsed: 0 };
  const cuda = parseNumber(gpu.cudaCores);
  const base = parseNumber(gpu.baseClock_GHz) || parseClockGHz(gpu.baseClock || gpu.coreClock);
  const boost = parseNumber(gpu.boostClock_GHz) || parseClockGHz(gpu.boostClock);
  const vram = parseNumber(gpu.memorySize_GB) || parseMemoryGB(gpu.memorySize || gpu.memory);
  const tdp = parseNumber(gpu.tdp_W) || parseNumber(gpu.tdp);
  const bandwidth = parseNumber(gpu.memoryBandwidth_GBps) || parseNumber(gpu.memoryBandwidth);
  const tdpEff = tdp ? clamp01(300 / tdp) : null; // 300W baseline
  const ray = (gpu.rayTracing || gpu.rayTracingCores) ? 1 : 0;
  const metrics = {
    mCuda: normDivide(cuda, 16384),
    mBase: normDivide(base, 2.5),
    mBoost: normDivide(boost, 3.0),
    mVram: normDivide(vram, 24),
    mBandwidth: normDivide(bandwidth, 1000), // GB/s rough upper
    mTdpEff: tdpEff,
    mRay: ray
  };
  const weights = { mCuda: 0.35, mBase: 0.1, mBoost: 0.1, mVram: 0.15, mBandwidth: 0.15, mTdpEff: 0.1, mRay: 0.05 };
  const avail = averagePresent(weights, metrics);
  let composite = 0;
  for (const k of Object.keys(weights)) if (metrics[k] != null) composite += metrics[k] * weights[k];
  composite /= avail;
  return { score: composite, details: { cuda, base, boost, vramGB: vram, tdp, bandwidth, detected: isDetected }, weightUsed: 0.45 };
}

function scoreRAM(ram) {
  if (!ram) return { score: 0, details: {}, weightUsed: 0 };
  const capacity = parseNumber(ram.totalCapacity_GB) || parseMemoryGB(ram.totalCapacity || ram.capacity || ram.capacity_GB || ram.memorySize);
  let speedRaw = ram.speed || ram.testedSpeed;
  const speed = parseNumber(speedRaw);
  const cas = parseNumber(ram.casLatency);
  const capacityScore = normDivide(capacity, 64);
  const speedScore = normDivide(speed, 6000);
  const casScore = cas ? clamp01(16 / cas) : null;
  const metrics = { capacityScore, speedScore, casScore };
  const weights = { capacityScore: 0.4, speedScore: 0.4, casScore: 0.2 };
  const avail = averagePresent(weights, metrics);
  let composite = 0;
  for (const k of Object.keys(weights)) if (metrics[k] != null) composite += metrics[k] * weights[k];
  composite /= avail;
  return { score: composite, details: { capacityGB: capacity, speedMHz: speed, cas }, weightUsed: 0.1 };
}

function scoreStorage(storage) {
  if (!storage) return { score: 0, details: {}, weightUsed: 0 };
  const capacity = parseNumber(storage.capacity_GB) || parseMemoryGB(storage.capacity);
  const read = parseNumber(storage.sequentialRead_MBps) || parseNumber(storage.sequentialRead);
  const write = parseNumber(storage.sequentialWrite_MBps) || parseNumber(storage.sequentialWrite);
  const capacityScore = normDivide(capacity, 2000);
  const readScore = normDivide(read, 7000);
  const writeScore = normDivide(write, 6000);
  const metrics = { capacityScore, readScore, writeScore };
  const weights = { capacityScore: 0.3, readScore: 0.35, writeScore: 0.35 };
  const avail = averagePresent(weights, metrics);
  let composite = 0;
  for (const k of Object.keys(weights)) if (metrics[k] != null) composite += metrics[k] * weights[k];
  composite /= avail;
  return { score: composite, details: { capacityGB: capacity, readMBps: read, writeMBps: write }, weightUsed: 0.05 };
}

function scoreMotherboard(mb) {
  if (!mb) return { score: 0, details: {}, weightUsed: 0 };
  const wifi = mb.wifi || mb.WiFi || mb.wireless;
  const chipset = (mb.chipset || '').toUpperCase();
  const maxMemory = parseNumber(mb.maxMemory_GB) || parseMemoryGB(mb.maxMemory);
  const slots = parseNumber(mb.memorySlots);
  let chipsetTier = 0.3;
  if (/Z79|X8|X7|X6|TRX|WRX/.test(chipset)) chipsetTier = 1;
  else if (/B65|B66|B67|B55|B56/.test(chipset)) chipsetTier = 0.7;
  else if (/H81|H6|A52|A55/.test(chipset)) chipsetTier = 0.4;
  const wifiScore = wifi ? 1 : 0;
  const memScore = normDivide(maxMemory, 256);
  const slotScore = normDivide(slots, 8);
  const metrics = { chipsetTier, wifiScore, memScore, slotScore };
  const weights = { chipsetTier: 0.4, wifiScore: 0.2, memScore: 0.25, slotScore: 0.15 };
  const avail = averagePresent(weights, metrics);
  let composite = 0;
  for (const k of Object.keys(weights)) if (metrics[k] != null) composite += metrics[k] * weights[k];
  composite /= avail;
  return { score: composite, details: { chipset, wifi: !!wifi, maxMemoryGB: maxMemory, slots }, weightUsed: 0.05 };
}

function extractCategorySpecs(product) {
  const cat = (product.category || '').toLowerCase();
  const specsMap = product.specifications instanceof Map ? Object.fromEntries(product.specifications) : (product.specifications || {});
  const d = product.detailedSpecs || {};
  if (cat === 'cpu') return d.cpu || specsMap;
  if (cat === 'ram') return d.ram || specsMap;
  if (cat === 'motherboard') return d.motherboard || specsMap;
  if (cat === 'storage') return d.storage || specsMap;
  if (cat === 'gpu') return d.gpu || specsMap;
  // Misclassified GPU under accessories
  const name = (product.name || '').toLowerCase();
  const tags = product.tags || [];
  const isGpuLike = /graphics card|geforce|rtx|rx \d{3,4}|arc \w+/i.test(product.name) || tags.some(t => /graphics cards?/i.test(t));
  if (cat === 'accessories' && isGpuLike) return d.gpu || specsMap;
  return specsMap;
}

function unwrapSpecs(p) {
  if (p && p.specs && typeof p.specs === 'object') return p.specs;
  return p;
}

function scoreBuild(products) {
  // products: array of Product docs or plain objects OR extracted benchmark entries
  const byCat = {};
  const detected = { gpuAccessory: false };
  for (const p of products) {
    const cat = (p.category || '').toLowerCase();
    const name = (p.name || '').toLowerCase();
    const tags = p.tags || [];
    if (p.specs) {
      // Already flattened benchmark entry
      if (cat === 'cpu' && !byCat.cpu) byCat.cpu = unwrapSpecs(p);
      else if (cat === 'accessories') {
        const isGpuLike = /graphics card|geforce|rtx|rx \d{3,4}|arc \w+/i.test(p.name) || (p.tags||[]).some(t=>/graphics cards?/i.test(t));
        if (isGpuLike && !byCat.gpu) { byCat.gpu = unwrapSpecs(p); detected.gpuAccessory = true; }
      } else if (cat === 'gpu' && !byCat.gpu) byCat.gpu = unwrapSpecs(p);
      else if (cat === 'ram' && !byCat.ram) byCat.ram = unwrapSpecs(p);
      else if (cat === 'motherboard' && !byCat.motherboard) byCat.motherboard = unwrapSpecs(p);
      else if (cat === 'storage' && !byCat.storage) byCat.storage = unwrapSpecs(p);
      continue;
    }
    if (cat === 'cpu' && !byCat.cpu) byCat.cpu = extractCategorySpecs(p);
    else if ((cat === 'gpu') && !byCat.gpu) byCat.gpu = extractCategorySpecs(p);
    else if (cat === 'ram' && !byCat.ram) byCat.ram = extractCategorySpecs(p);
    else if (cat === 'motherboard' && !byCat.motherboard) byCat.motherboard = extractCategorySpecs(p);
    else if (cat === 'storage' && !byCat.storage) byCat.storage = extractCategorySpecs(p);
    else if (cat === 'accessories') {
      const isGpuLike = /graphics card|geforce|rtx|rx \d{3,4}|arc \w+/i.test(p.name) || tags.some(t => /graphics cards?/i.test(t));
      if (isGpuLike && !byCat.gpu) { byCat.gpu = extractCategorySpecs(p); detected.gpuAccessory = true; }
    }
  }

  const cpuRes = scoreCPU(byCat.cpu);
  const gpuRes = scoreGPU(byCat.gpu, detected.gpuAccessory);
  const ramRes = scoreRAM(byCat.ram);
  const storageRes = scoreStorage(byCat.storage);
  const mbRes = scoreMotherboard(byCat.motherboard);

  // Sum weights actually used (if category present, else weight 0 already)
  const parts = [cpuRes, gpuRes, ramRes, storageRes, mbRes];
  let totalWeight = 0;
  for (const p of parts) if (p.score > 0) totalWeight += p.weightUsed;
  if (!totalWeight) totalWeight = 1;
  const scaled = parts.map(p => (p.score > 0 ? (p.score * (p.weightUsed / totalWeight)) : 0));
  const totalComposite = scaled.reduce((a, b) => a + b, 0);
  const totalScore = Math.round(totalComposite * 1000);

  return {
    totalScore,
    normalizedComposite: totalComposite,
    breakdown: {
      cpu: cpuRes,
      gpu: gpuRes,
      ram: ramRes,
      storage: storageRes,
      motherboard: mbRes
    },
    notes: detected.gpuAccessory ? ['GPU detected under Accessories category'] : []
  };
}

module.exports = { scoreBuild };
